import { GlideClusterClient, GlideString } from "@valkey/valkey-glide";
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
    TickListIndex,
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
    ValkeyZSetKey,
    toPermission,
} from "./valkeySchema";
import { AMFlowStoreBase } from "./AMFlowStoreBase";

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
    memoryTickBufferSize: number;
}

interface MemoryEventEntry {
    frame: number;
    unfilteredEvents: Event[];
    filteredEvents: Event[];
}

export class ValkeyAMFlowStore extends AMFlowStoreBase {
    _valkey: GlideClusterClient;
    _latestTickFrame: number;
    _nextUnfilteredEventId: number;
    _nextSnapshotId: number;
    _isDestroyed: boolean;
    _hashPlayId: string;
    _keyList: string[];
    _startPointQueue: Promise<void>;

    _memoryTickBufferSize: number;
    _memoryOldestFrame: number;
    _memoryTickBuffer: MemoryEventEntry[];

    _valkeyWriteQueue: TickPack[];
    _isValkeyDraining: boolean;
    _valkeyDrainPromise: Promise<void>;

    constructor(param: ValkeyAMFlowStoreParameterObject) {
        super(param.playId);
        this._valkey = param.valkey;
        this._latestTickFrame = -1;
        this._nextUnfilteredEventId = 1;
        this._nextSnapshotId = 1;
        this._isDestroyed = false;
        this._hashPlayId = `{${this.playId}}`;
        this._keyList = [];
        this._startPointQueue = Promise.resolve();

        this._memoryTickBufferSize = param.memoryTickBufferSize;
        this._memoryOldestFrame = -1;
        this._memoryTickBuffer = [];

        this._valkeyWriteQueue = [];
        this._isValkeyDraining = false;
        this._valkeyDrainPromise = Promise.resolve();
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
        const accepted = this._updateMemoryState(tickPack);
        if (!accepted) {
            return Promise.resolve();
        }
        for (const tick of toTickList(tickPack)) {
            this.sendTick(tick);
        }
        if (convertTickPack.isTick(tickPack) && tickPack[TickIndex.Events]) {
            this._enqueueValkeyWrite(tickPack);
        }
        return Promise.resolve();
    }

    private _updateMemoryState(tickPack: TickPack) {
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
            if (tickPack[TickIndex.Events]) {
                const unfilteredEvents = tickPack[TickIndex.Events].filter(
                    (event) =>
                        !(
                            event[EventIndex.EventFlags] &
                            EventFlagsMask.Transient
                        ),
                );
                const filteredEvents = unfilteredEvents.filter(
                    (event) =>
                        !(
                            event[EventIndex.EventFlags] &
                            EventFlagsMask.Ignorable
                        ),
                );
                if (unfilteredEvents.length > 0) {
                    this._memoryTickBuffer.push({
                        frame,
                        unfilteredEvents,
                        filteredEvents,
                    });
                }
            }
        } else {
            return false;
        }

        this._latestTickFrame = frame;
        if (this._memoryOldestFrame === -1) {
            this._memoryOldestFrame = frame;
        }
        const evictBefore = frame - this._memoryTickBufferSize;
        if (evictBefore > this._memoryOldestFrame) {
            while (
                this._memoryTickBuffer.length > 0 &&
                this._memoryTickBuffer[0].frame < evictBefore
            ) {
                this._memoryTickBuffer.shift();
            }
            this._memoryOldestFrame = evictBefore;
        }
        return true;
    }

    private _enqueueValkeyWrite(tickPack: TickPack) {
        this._valkeyWriteQueue.push(tickPack);
        if (!this._isValkeyDraining) {
            this._valkeyDrainPromise = this._drainValkeyQueue();
        }
    }

    private async _drainValkeyQueue() {
        this._isValkeyDraining = true;
        while (this._valkeyWriteQueue.length > 0) {
            const tickPack = this._valkeyWriteQueue.shift()!;
            try {
                await this._pushTick(tickPack);
            } catch (err) {
                console.error(
                    `failed to persist tick to valkey (playId = ${this.playId})`,
                    err,
                );
            }
        }
        this._isValkeyDraining = false;
    }

    async getTickList(opts: GetTickListOptions) {
        const from = opts.begin;
        const to = Math.min(opts.end - 1, this._latestTickFrame);
        if (to < from) {
            return null;
        }
        const filterIgnorable = opts.excludeEventFlags?.ignorable ?? false;

        // 要求範囲が完全にメモリバッファ内
        if (this._memoryOldestFrame !== -1 && from >= this._memoryOldestFrame) {
            return this._getTickListFromMemory(from, to, filterIgnorable);
        }

        // 要求範囲がメモリバッファと Valkey をまたぐ場合
        // Valkey 書き込みラグで直近 tick が Valkey に未反映の可能性があるため両方を合成する
        if (this._memoryOldestFrame !== -1 && to >= this._memoryOldestFrame) {
            const [valkeyList, memoryList] = await Promise.all([
                this._getTickListFromValkey(
                    from,
                    this._memoryOldestFrame - 1,
                    filterIgnorable,
                ),
                Promise.resolve(
                    this._getTickListFromMemory(
                        this._memoryOldestFrame,
                        to,
                        filterIgnorable,
                    ),
                ),
            ]);
            return this._mergeTickLists(from, to, valkeyList, memoryList);
        }

        // 要求範囲が完全に Valkey 内
        return this._getTickListFromValkey(from, to, filterIgnorable);
    }

    private _mergeTickLists(
        from: number,
        to: number,
        ...lists: TickList[]
    ): TickList {
        const ticks: Tick[] = [];
        for (const list of lists) {
            if (list[TickListIndex.Ticks]) {
                ticks.push(...list[TickListIndex.Ticks]);
            }
        }
        return ticks.length > 0 ? [from, to, ticks] : [from, to];
    }

    private _getTickListFromMemory(
        from: number,
        to: number,
        filterIgnorable: boolean,
    ): TickList {
        const entries = this._memoryTickBuffer.filter(
            ({ frame }) => frame >= from && frame <= to,
        );
        if (entries.length === 0) {
            return [from, to];
        }
        const ticks: Tick[] = entries
            .map(
                ({ frame, unfilteredEvents, filteredEvents }) =>
                    [
                        frame,
                        filterIgnorable ? filteredEvents : unfilteredEvents,
                    ] as Tick,
            )
            .filter((tick) => tick[TickIndex.Events]);
        return ticks.length > 0 ? [from, to, ticks] : [from, to];
    }

    private async _getTickListFromValkey(
        from: number,
        to: number,
        filterIgnorable: boolean,
    ): Promise<TickList> {
        return withValkeySpan(
            "valkey.getTickList",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.tick.from": from,
                "amflow.tick.to": to,
                "amflow.filter_ignorable": filterIgnorable,
            },
            (span) =>
                this._doGetTickListFromValkey(from, to, filterIgnorable, span),
        );
    }

    private async _doGetTickListFromValkey(
        from: number,
        to: number,
        filterIgnorable: boolean,
        span: Span,
    ): Promise<TickList> {
        const scores = filterIgnorable
            ? await this._valkey.zrangeWithScores(
                  genKey(ValkeyZSetKey.FilteredEvent, this._hashPlayId),
                  {
                      type: "byScore",
                      start: { value: from },
                      end: { value: to },
                  },
              )
            : await this._valkey.zrangeWithScores(
                  genKey(ValkeyZSetKey.UnfilteredEvent, this._hashPlayId),
                  {
                      type: "byScore",
                      start: { value: from },
                      end: { value: to },
                  },
              );
        span.setAttribute("amflow.score.count", scores.length);
        if (scores.length === 0) {
            return [from, to];
        }
        const rawEvList = await Promise.all(
            scores
                .map(({ score, element }) => ({
                    tick: score,
                    eventId: parseInt(element.toString()),
                }))
                .map(async ({ tick, eventId }) => ({
                    tick,
                    eventId,
                    event: await this._valkey.get(
                        genKey(ValkeyKey.Event, this._hashPlayId, eventId),
                    ),
                })),
        );
        this._warnIfNotFoundEventRecord(filterIgnorable, rawEvList);
        const evList = rawEvList
            .filter(({ event }) => event)
            .map(({ tick, eventId, event }) => {
                try {
                    return {
                        tick,
                        event: JSON.parse(event!.toString()) as Event,
                    };
                } catch (err) {
                    console.warn(
                        `failed to parse event data "${event}" (playId = ${this.playId}, eventId = ${eventId}, tick = ${tick})`,
                    );
                    return {
                        tick,
                        event: null,
                    };
                }
            })
            .filter(({ event }) => event) as { tick: number; event: Event }[];
        return [from, to, this._toTickList(evList)];
    }

    putStartPoint(startPoint: StartPoint) {
        this._startPointQueue = this._startPointQueue
            .catch(() => {})
            .then(() => this._doPutStartPoint(startPoint));
        return this._startPointQueue;
    }

    private async _doPutStartPoint(startPoint: StartPoint) {
        return withValkeySpan(
            "valkey.putStartPoint",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.startPoint.frame": startPoint.frame,
            },
            () => this._doPutStartPointInner(startPoint),
        );
    }

    private async _doPutStartPointInner(startPoint: StartPoint) {
        const startPointKey = genKey(
            ValkeyKey.StartPoint,
            this._hashPlayId,
            this._nextSnapshotId,
        );
        await this._valkey.set(startPointKey, JSON.stringify(startPoint));
        this._keyList.push(startPointKey);
        await this._valkey.zadd(
            genKey(ValkeyZSetKey.StartPointByFrame, this._hashPlayId),
            [
                {
                    score: startPoint.frame,
                    element: this._nextSnapshotId.toString(),
                },
            ],
        );
        await this._valkey.zadd(
            genKey(ValkeyZSetKey.StartPointByTimestamp, this._hashPlayId),
            [
                {
                    score: startPoint.timestamp,
                    element: this._nextSnapshotId.toString(),
                },
            ],
        );
        this._nextSnapshotId++;
    }

    async getStartPoint(opts: GetStartPointOptions) {
        const isFirst =
            opts.frame === 0 || (opts.frame == null && opts.timestamp == null);

        if (isFirst) {
            const ids = await this._valkey.zrange(
                genKey(ValkeyZSetKey.StartPointByFrame, this._hashPlayId),
                {
                    start: 0,
                    end: 0,
                },
            );
            return this._restoreStartPointFromIds(ids);
        } else if (opts.timestamp != null) {
            const ids = await this._valkey.zrange(
                genKey(ValkeyZSetKey.StartPointByTimestamp, this._hashPlayId),
                {
                    start: {
                        value: opts.timestamp,
                        isInclusive: false,
                    },
                    end: {
                        value: 0,
                    },
                    type: "byScore",
                    limit: {
                        offset: 0,
                        count: 1,
                    },
                },
                {
                    reverse: true,
                },
            );
            return this._restoreStartPointFromIds(ids);
        } else if (opts.frame != null) {
            const ids = await this._valkey.zrange(
                genKey(ValkeyZSetKey.StartPointByFrame, this._hashPlayId),
                {
                    start: {
                        value: opts.frame - 1,
                    },
                    end: {
                        value: 0,
                    },
                    type: "byScore",
                    limit: {
                        offset: 0,
                        count: 1,
                    },
                },
                {
                    reverse: true,
                },
            );
            return this._restoreStartPointFromIds(ids);
        }
        return null;
    }

    async destroy() {
        if (this._isDestroyed) {
            return;
        }
        await this._valkeyDrainPromise;
        await this._valkey.unlink([
            genKey(ValkeyZSetKey.UnfilteredEvent, this._hashPlayId),
            genKey(ValkeyZSetKey.FilteredEvent, this._hashPlayId),
            genKey(ValkeyZSetKey.StartPointByFrame, this._hashPlayId),
            genKey(ValkeyZSetKey.StartPointByTimestamp, this._hashPlayId),
            ...this._keyList,
        ]);
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

    _toTickList(evList: { tick: number; event: Event }[]) {
        const tickList: Tick[] = [];
        if (evList.length === 0) {
            return tickList;
        }
        let currentTick = evList[0].tick;
        let evs: Event[] = [];
        for (const { tick, event } of evList) {
            if (tick !== currentTick) {
                tickList.push([currentTick, evs]);
                currentTick = tick;
                evs = [];
            }
            evs.push(event);
        }
        tickList.push([currentTick, evs]);
        return tickList;
    }

    /**
     * null な ev はデータ不整合が起きていることを示すので、念の為ログにだす
     */
    _warnIfNotFoundEventRecord(
        filterIgnorable: boolean,
        eventList: {
            tick: number;
            eventId: number;
            event: GlideString | null;
        }[],
    ) {
        const notFoundEvents = eventList.filter(({ event }) => event == null);
        if (notFoundEvents.length > 0) {
            const sourceZsetKey = filterIgnorable
                ? ValkeyZSetKey.FilteredEvent
                : ValkeyZSetKey.UnfilteredEvent;
            console.warn(
                `following id does not exist in ${ValkeyKey.Event} even though ${sourceZsetKey} refer`,
                notFoundEvents.map(
                    ({ tick, eventId }) =>
                        `:${eventId} (playId = ${this.playId}, tick = ${tick})`,
                ),
            );
        }
    }

    async _pushTick(tickPack: TickPack) {
        if (!convertTickPack.isTick(tickPack) || !tickPack[TickIndex.Events]) {
            return;
        }
        const frame = tickPack[TickIndex.Frame];
        return withValkeySpan(
            "valkey.pushTick",
            {
                "db.system": "valkey",
                "play.id": this.playId,
                "amflow.tick.frame": frame,
                // 書き込みキューの滞留量。直列ドレインのため断続ラグの主要因はここに出る。
                "valkey.write_queue.depth": this._valkeyWriteQueue.length,
            },
            async (span) => {
                const unfilteredEvents = this._genEventIds(
                    tickPack[TickIndex.Events]!.filter(
                        (event) =>
                            !(
                                event[EventIndex.EventFlags] &
                                EventFlagsMask.Transient
                            ),
                    ),
                );
                const filteredEvents = unfilteredEvents.filter(
                    ({ event }) =>
                        !(
                            event[EventIndex.EventFlags] &
                            EventFlagsMask.Ignorable
                        ),
                );
                span.setAttribute(
                    "amflow.event.count",
                    unfilteredEvents.length,
                );
                await Promise.all([
                    this._storeEvents(unfilteredEvents),
                    this._storeUnfilteredEvents(frame, unfilteredEvents),
                    this._storeFilteredEvents(frame, filteredEvents),
                ]);
                this._nextUnfilteredEventId += unfilteredEvents.length;
            },
        );
    }

    /**
     * Event の順序性を保つため EventID を採番しているが、 Redis の仕様上 string 型にしなければならない。
     * そのため桁が変わる場合のみ 0埋めする。
     */
    _genEventIds(events: Event[]) {
        const offset = this._nextUnfilteredEventId;
        // 同一 TickFrame の eventId のみ辞書順オーダーであればよいため、このフレームで採番しうる最大のIDを求めている
        const maxId = (offset + events.length).toString();
        return events.map((event, i) => ({
            id: this._toPaddedEventId(offset + i, maxId),
            event,
        }));
    }

    async _storeUnfilteredEvents(
        tick: number,
        events: { event: Event; id: string }[],
    ) {
        await Promise.all(
            events.map(async ({ id }) => {
                await this._valkey.zadd(
                    genKey(ValkeyZSetKey.UnfilteredEvent, this._hashPlayId),
                    [
                        {
                            score: tick,
                            element: id,
                        },
                    ],
                );
            }),
        );
    }

    async _storeFilteredEvents(
        tick: number,
        events: { event: Event; id: string }[],
    ) {
        await Promise.all(
            events.map(async ({ id }) => {
                await this._valkey.zadd(
                    genKey(ValkeyZSetKey.FilteredEvent, this._hashPlayId),
                    [
                        {
                            score: tick,
                            element: id,
                        },
                    ],
                );
            }),
        );
    }

    async _storeEvents(events: { event: Event; id: string }[]) {
        const evs = events.map(({ event, id }) => ({
            key: genKey(ValkeyKey.Event, this._hashPlayId, parseInt(id)),
            value: JSON.stringify(event),
        }));
        await Promise.all(
            evs.map(({ key, value }) => this._valkey.set(key, value)),
        );
        this._keyList.push(...evs.map(({ key }) => key));
    }

    _toPaddedEventId(current: number, max: string) {
        const currentId = current.toString();
        if (currentId.length === max.length) {
            return currentId;
        } else {
            const pad = new Array(max.length - currentId.length).fill("0");
            return pad.join("") + currentId;
        }
    }

    async _restoreStartPointFromIds(ids: GlideString[]) {
        if (ids.length === 0) {
            return null;
        } else {
            return await this._restoreStartPoint(parseInt(ids[0].toString()));
        }
    }

    async _restoreStartPoint(id: number) {
        const startpoint = await this._valkey.get(
            genKey(ValkeyKey.StartPoint, this._hashPlayId, id),
        );
        if (startpoint == null) {
            console.warn(
                `${id} does not exist in ${ValkeyKey.StartPoint} even though zset refer`,
            );
            return null;
        }
        try {
            // 解析に失敗した場合、その前のStartPointを取得しリトライする戦法も考えられるが、
            // 異常系のため StartPoint なし として結果を返す
            return JSON.parse(startpoint.toString()) as StartPoint;
        } catch (err) {
            console.warn(
                `failed to parse startpoint "${startpoint}" (playId = ${this.playId}, startpointId = ${id})`,
            );
            return null;
        }
    }
}
