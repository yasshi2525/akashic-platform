import { GlideClusterClient } from "@valkey/valkey-glide";
import {
    trace,
    SpanKind,
    SpanStatusCode,
    Span,
    Attributes,
} from "@opentelemetry/api";
import type {
    GetStartPointOptions,
    GetTickListOptions,
    StartPoint,
} from "@akashic/amflow";
import {
    Event,
    Tick,
    TickList,
    TickIndex,
    EventIndex,
    EventFlagsMask,
} from "@akashic/playlog";
import {
    BadRequestError,
    convertTickPack,
    TickPack,
    toTickList,
} from "@yasshi2525/amflow-server-event-schema";
import {
    genKey,
    PermissionType,
    ValkeyKey,
    toPermission,
} from "./valkeySchema";
import { AMFlowStoreBase } from "./AMFlowStoreBase";
import { applyBaggageAttributes } from "./tracingAttributes";

const tracer = trace.getTracer("akashic-storage.valkey");

/**
 * ElastiCache(Valkey) への読み書きを 1 スパンとして計測する。
 * valkey-glide には OpenTelemetry 自動計装が存在しないため、ホットパスを
 * 手動計装することで「Socket.IO ハンドラ → Valkey R/W」のどこで時間を要したか
 * を可視化する。CLIENT スパンとして親（AMFlow のサーバースパン）にぶら下がる。
 */
const withValkeySpan = <T>(
    name: string,
    attributes: Attributes,
    fn: (span: Span) => Promise<T>,
): Promise<T> =>
    tracer.startActiveSpan(
        name,
        { kind: SpanKind.CLIENT, attributes },
        async (span) => {
            applyBaggageAttributes(span);
            try {
                return await fn(span);
            } catch (err) {
                span.recordException(err as Error);
                span.setStatus({ code: SpanStatusCode.ERROR });
                throw err;
            } finally {
                span.end();
            }
        },
    );

interface ValkeyAMFlowStoreParameterObject {
    valkey: GlideClusterClient;
    playId: string;
    chunkSize: number;
    memoryRetentionMs: number;
}

interface StartPointIndexEntry {
    id: number;
    frame: number;
    timestamp: number;
}

interface RetainedChunk {
    ticks: Tick[];
    sealedAt: number;
    persisted: boolean;
}

/**
 * playlog（Tick）の保存方式:
 *
 * `chunkSize` フレーム分の Tick をまとめて 1 キー(チャンク)に直列化する。 1チャンク分たまったら永続化。
 * 直近の getTickList 要求（最近数秒）を確実にメモリから返せるよう、 `memoryRetentionMs` の間はメモリに保持する。
 * StartPoint は数が少ないため `(id, frame, timestamp)` の索引をメモリに常駐。本体のみ永続化。
 */
export class ValkeyAMFlowStore extends AMFlowStoreBase {
    _valkey: GlideClusterClient;
    _latestTickFrame: number;
    _nextSnapshotId: number;
    _isDestroyed: boolean;
    _hashPlayId: string;
    /** destroy 時に unlink するキー一覧 */
    _keyList: string[];
    _chunkSize: number;
    _memoryRetentionMs: number;
    _currentChunkIndex: number;
    _currentChunkTicks: Tick[];
    _retainedChunks: Map<number, RetainedChunk>;
    _startPointIndex: StartPointIndexEntry[];
    _pendingStartPoints: Map<number, StartPoint>;
    _inflightWrites: Set<Promise<void>>;

    constructor(param: ValkeyAMFlowStoreParameterObject) {
        super(param.playId);
        this._valkey = param.valkey;
        this._latestTickFrame = -1;
        this._nextSnapshotId = 1;
        this._isDestroyed = false;
        this._hashPlayId = `{${this.playId}}`;
        this._keyList = [];
        this._chunkSize = param.chunkSize;
        this._memoryRetentionMs = param.memoryRetentionMs;
        this._currentChunkIndex = -1;
        this._currentChunkTicks = [];
        this._retainedChunks = new Map();
        this._startPointIndex = [];
        this._pendingStartPoints = new Map();
        this._inflightWrites = new Set();
    }

    async authenticate(token: string) {
        return withValkeySpan(
            "valkey.authenticate",
            { "db.system": "valkey", "play.id": this.playId, "db.op": "get" },
            async () => {
                const permissionType = await this._valkey.get(
                    genKey(ValkeyKey.Token, this._hashPlayId, token),
                );
                if (!permissionType) {
                    throw new BadRequestError("invalid token");
                }
                return toPermission(permissionType as PermissionType);
            },
        );
    }

    sendTickPack(tickPack: TickPack) {
        const accepted = this._updateState(tickPack);
        if (!accepted) {
            return Promise.resolve();
        }
        for (const tick of toTickList(tickPack)) {
            this.sendTick(tick);
        }
        return Promise.resolve();
    }

    private _updateState(tickPack: TickPack) {
        let frame: number;

        if (convertTickPack.isNumber(tickPack)) {
            if (tickPack <= this._latestTickFrame) {
                // illegal age tick
                return false;
            }
            frame = tickPack;
        } else if (convertTickPack.isTickFrame(tickPack)) {
            if (tickPack.to <= this._latestTickFrame) {
                // illegal age tick
                return false;
            }
            frame = tickPack.to;
        } else if (convertTickPack.isTick(tickPack)) {
            if (tickPack[TickIndex.Frame] <= this._latestTickFrame) {
                // illegal age tick
                return false;
            }
            frame = tickPack[TickIndex.Frame];
            const events = tickPack[TickIndex.Events];
            if (events) {
                const unfilteredEvents = events.filter(
                    (event) =>
                        !(
                            event[EventIndex.EventFlags] &
                            EventFlagsMask.Transient
                        ),
                );
                if (unfilteredEvents.length > 0) {
                    this._appendTick(frame, unfilteredEvents);
                }
            }
        } else {
            return false;
        }

        this._latestTickFrame = frame;
        return true;
    }

    private _appendTick(frame: number, events: Event[]) {
        const chunkIndex = Math.floor(frame / this._chunkSize);
        if (this._currentChunkIndex === -1) {
            this._currentChunkIndex = chunkIndex;
        } else if (chunkIndex > this._currentChunkIndex) {
            // 境界跨ぎ
            this._sealCurrentChunk();
            this._currentChunkIndex = chunkIndex;
            this._currentChunkTicks = [];
        }
        this._currentChunkTicks.push([frame, events]);
    }

    private _sealCurrentChunk() {
        if (this._currentChunkTicks.length === 0) {
            return;
        }
        this._evictExpiredChunks();
        const chunkIndex = this._currentChunkIndex;
        const ticks = this._currentChunkTicks;
        const key = genKey(ValkeyKey.TickChunk, this._hashPlayId, chunkIndex);
        const retained: RetainedChunk = {
            ticks,
            sealedAt: Date.now(),
            persisted: false,
        };
        this._retainedChunks.set(chunkIndex, retained);
        this._keyList.push(key);
        const write = withValkeySpan(
            "valkey.sealChunk",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.chunk.index": chunkIndex,
                "amflow.chunk.tick_count": ticks.length,
            },
            () => this._valkey.set(key, JSON.stringify(ticks)),
        )
            .then(() => {
                retained.persisted = true;
            })
            .catch((err) => {
                console.error(
                    `failed to persist tick chunk to valkey (playId = ${this.playId}, chunkIndex = ${chunkIndex})`,
                    err,
                );
            })
            .finally(() => {
                this._inflightWrites.delete(write);
            });
        this._inflightWrites.add(write);
    }

    private _evictExpiredChunks() {
        const now = Date.now();
        for (const [chunkIndex, chunk] of this._retainedChunks) {
            // 永続化未完了のチャンクは valkey にまだ無い可能性があるため保持し続ける
            if (
                chunk.persisted &&
                now - chunk.sealedAt >= this._memoryRetentionMs
            ) {
                this._retainedChunks.delete(chunkIndex);
            }
        }
    }

    async getTickList(opts: GetTickListOptions): Promise<TickList | null> {
        const from = opts.begin;
        const to = Math.min(opts.end - 1, this._latestTickFrame);
        if (to < from) {
            return null;
        }
        const filterIgnorable = opts.excludeEventFlags?.ignorable ?? false;

        const ticks = await this._collectTicks(from, to, filterIgnorable);
        return ticks.length > 0 ? [from, to, ticks] : [from, to];
    }

    private async _collectTicks(
        from: number,
        to: number,
        filterIgnorable: boolean,
    ) {
        const firstChunk = Math.floor(from / this._chunkSize);
        const lastChunk = Math.floor(to / this._chunkSize);

        const chunkTicksByIndex = new Map<number, Tick[]>();
        const valkeyChunkIndices: number[] = [];
        for (let idx = firstChunk; idx <= lastChunk; idx++) {
            const memTicks = this._getMemoryChunk(idx);
            if (memTicks) {
                chunkTicksByIndex.set(idx, memTicks);
            } else {
                valkeyChunkIndices.push(idx);
            }
        }

        if (valkeyChunkIndices.length > 0) {
            const fetched =
                await this._fetchChunksFromValkey(valkeyChunkIndices);
            for (const [idx, ticks] of fetched) {
                chunkTicksByIndex.set(idx, ticks);
            }
        }

        const result: Tick[] = [];
        for (let idx = firstChunk; idx <= lastChunk; idx++) {
            const ticks = chunkTicksByIndex.get(idx);
            if (!ticks) {
                continue;
            }
            for (const tick of ticks) {
                const frame = tick[TickIndex.Frame];
                if (frame < from || frame > to) {
                    continue;
                }
                const events = this._filterEvents(tick, filterIgnorable);
                if (events && events.length > 0) {
                    result.push([frame, events]);
                }
            }
        }
        return result;
    }

    private _getMemoryChunk(chunkIndex: number) {
        if (chunkIndex === this._currentChunkIndex) {
            return this._currentChunkTicks;
        }
        return this._retainedChunks.get(chunkIndex)?.ticks;
    }

    private _filterEvents(tick: Tick, filterIgnorable: boolean) {
        const events = tick[TickIndex.Events];
        if (!events) {
            return null;
        }
        if (!filterIgnorable) {
            return events;
        }
        return events.filter(
            (event) =>
                !(event[EventIndex.EventFlags] & EventFlagsMask.Ignorable),
        );
    }

    private async _fetchChunksFromValkey(chunkIndices: number[]) {
        return withValkeySpan(
            "valkey.getTickList",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.chunk.count": chunkIndices.length,
                "amflow.chunk.first": chunkIndices[0],
                "amflow.chunk.last": chunkIndices[chunkIndices.length - 1],
            },
            async () => {
                const keys = chunkIndices.map((idx) =>
                    genKey(ValkeyKey.TickChunk, this._hashPlayId, idx),
                );
                const values = await this._valkey.mget(keys);
                const result = new Map<number, Tick[]>();
                values.forEach((value, i) => {
                    if (value == null) {
                        return;
                    }
                    const chunkIndex = chunkIndices[i];
                    try {
                        result.set(
                            chunkIndex,
                            JSON.parse(value.toString()) as Tick[],
                        );
                    } catch (err) {
                        console.warn(
                            `failed to parse tick chunk (playId = ${this.playId}, chunkIndex = ${chunkIndex})`,
                            err,
                        );
                    }
                });
                return result;
            },
        );
    }

    putStartPoint(startPoint: StartPoint) {
        const id = this._nextSnapshotId++;
        this._startPointIndex.push({
            id,
            frame: startPoint.frame,
            timestamp: startPoint.timestamp,
        });
        this._pendingStartPoints.set(id, startPoint);
        const key = genKey(ValkeyKey.StartPoint, this._hashPlayId, id);
        this._keyList.push(key);
        const write = withValkeySpan(
            "valkey.putStartPoint",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.startPoint.frame": startPoint.frame,
            },
            () => this._valkey.set(key, JSON.stringify(startPoint)),
        )
            .then(() => {
                this._pendingStartPoints.delete(id);
            })
            .catch((err) => {
                console.error(
                    `failed to persist startpoint to valkey (playId = ${this.playId}, startpointId = ${id})`,
                    err,
                );
            })
            .finally(() => {
                this._inflightWrites.delete(write);
            });
        this._inflightWrites.add(write);
        return write;
    }

    async getStartPoint(opts: GetStartPointOptions) {
        const isFirst =
            opts.frame === 0 || (opts.frame == null && opts.timestamp == null);

        let target: StartPointIndexEntry | null = null;
        if (isFirst) {
            target = this._startPointIndex[0] ?? null;
        } else if (opts.timestamp != null) {
            target = this._findLatest(
                (entry) => entry.timestamp < opts.timestamp!,
                (entry) => entry.timestamp,
            );
        } else if (opts.frame != null) {
            target = this._findLatest(
                (entry) => entry.frame < opts.frame!,
                (entry) => entry.frame,
            );
        }
        if (!target) {
            return null;
        }
        return this._restoreStartPoint(target.id);
    }

    private _findLatest(
        predicate: (entry: StartPointIndexEntry) => boolean,
        score: (entry: StartPointIndexEntry) => number,
    ) {
        let best: StartPointIndexEntry | null = null;
        for (const entry of this._startPointIndex) {
            if (predicate(entry) && (!best || score(entry) >= score(best))) {
                best = entry;
            }
        }
        return best;
    }

    private async _restoreStartPoint(id: number) {
        const pending = this._pendingStartPoints.get(id);
        if (pending) {
            return pending;
        }
        const startpoint = await withValkeySpan(
            "valkey.getStartPoint",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.startPoint.id": id,
            },
            () =>
                this._valkey.get(
                    genKey(ValkeyKey.StartPoint, this._hashPlayId, id),
                ),
        );
        if (startpoint == null) {
            console.warn(
                `${id} does not exist in ${ValkeyKey.StartPoint} even though index refer (playId = ${this.playId})`,
            );
            return null;
        }
        try {
            return JSON.parse(startpoint.toString()) as StartPoint;
        } catch (err) {
            console.warn(
                `failed to parse startpoint "${startpoint}" (playId = ${this.playId}, startpointId = ${id})`,
                err,
            );
            return null;
        }
    }

    async destroy() {
        if (this._isDestroyed) {
            return;
        }
        // 進行中の書き込みを待ってから unlink する
        await Promise.all([...this._inflightWrites]);
        if (this._keyList.length > 0) {
            await this._valkey.unlink(this._keyList);
        }
        this._isDestroyed = true;
    }

    isDestroyed() {
        return this._isDestroyed;
    }

    /**
     * 汎用的には Permission に対応すべきだが、現状アクティブ・パッシブしか用途がないため限定
     */
    async createPlayToken(permissionType: PermissionType) {
        const token = this._createPlayToken();
        const key = genKey(ValkeyKey.Token, this._hashPlayId, token);
        await this._valkey.set(key, permissionType);
        this._keyList.push(key);
        return token;
    }
}
