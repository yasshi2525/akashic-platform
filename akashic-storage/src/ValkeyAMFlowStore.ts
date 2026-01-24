import { GlideClient, GlideString, ObjectType } from "@valkey/valkey-glide";
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
    ValkeyZSetKey,
    toPermission,
} from "./valkeySchema";
import { AMFlowStoreBase } from "./AMFlowStoreBase";

interface ValkeyAMFlowStoreParameterObject {
    valkey: GlideClient;
    playId: string;
}

export class ValkeyAMFlowStore extends AMFlowStoreBase {
    _valkey: GlideClient;
    _latestTickFrame: number;
    _nextUnfilteredEventId: number;
    _nextSnapshotId: number;
    _isDestroyed: boolean;

    constructor(param: ValkeyAMFlowStoreParameterObject) {
        super(param.playId);
        this._valkey = param.valkey;
        this._latestTickFrame = -1;
        this._nextUnfilteredEventId = 1;
        this._nextSnapshotId = 1;
        this._isDestroyed = false;
    }

    async authenticate(token: string) {
        const permissionType = await this._valkey.get(
            genKey(ValkeyKey.Token, this.playId, token),
        );
        if (!permissionType) {
            throw new BadRequestError("invalid token");
        }
        return toPermission(permissionType as PermissionType);
    }

    async sendTickPack(tickPack: TickPack) {
        await this._pushTick(tickPack);
        for (const tick of toTickList(tickPack)) {
            this.sendTick(tick);
        }
    }

    async getTickList(opts: GetTickListOptions): Promise<TickList | null> {
        const from = opts.begin;
        const to = Math.min(opts.end - 1, this._latestTickFrame);
        if (to < from) {
            return null;
        }
        const scores = opts.excludeEventFlags?.ignorable
            ? await this._valkey.zrangeWithScores(
                  genKey(ValkeyZSetKey.FilteredEvent, this.playId),
                  {
                      type: "byScore",
                      start: from,
                      end: to,
                  },
              )
            : await this._valkey.zrangeWithScores(
                  genKey(ValkeyZSetKey.UnfilteredEvent, this.playId),
                  {
                      type: "byScore",
                      start: from,
                      end: to,
                  },
              );
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
                    eventId: eventId,
                    event: await this._valkey.get(
                        genKey(ValkeyKey.Event, this.playId, eventId),
                    ),
                })),
        );
        this._warnIfNotFoundEventRecord(opts, rawEvList);
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
        return [from, to, this._toTickList(from, to, evList)];
    }

    async putStartPoint(startPoint: StartPoint) {
        await this._valkey.zadd(
            genKey(ValkeyZSetKey.StartPointByFrame, this.playId),
            [
                {
                    score: startPoint.frame,
                    element: this._nextSnapshotId.toString(),
                },
            ],
        );
        await this._valkey.zadd(
            genKey(ValkeyZSetKey.StartPointByTimestamp, this.playId),
            [
                {
                    score: startPoint.timestamp,
                    element: this._nextSnapshotId.toString(),
                },
            ],
        );
        await this._valkey.set(
            genKey(ValkeyKey.StartPoint, this.playId, this._nextSnapshotId),
            JSON.stringify(startPoint),
        );
        this._nextSnapshotId++;
    }

    async getStartPoint(opts: GetStartPointOptions) {
        const isFirst =
            opts.frame === 0 || (opts.frame == null && opts.timestamp == null);

        if (isFirst) {
            const ids = await this._valkey.zrange(
                genKey(ValkeyZSetKey.StartPointByFrame, this.playId),
                {
                    start: 0,
                    end: 0,
                },
            );
            return this._restoreStartPointFromIds(ids);
        } else if (opts.timestamp != null) {
            const ids = await this._valkey.zrange(
                genKey(ValkeyZSetKey.StartPointByTimestamp, this.playId),
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
                genKey(ValkeyZSetKey.StartPointByFrame, this.playId),
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
        const tokens = await this.getAllKeys(
            genKey(ValkeyKey.Token, this.playId, "*"),
        );
        const ufEvents = await this.getAllKeys(
            genKey(ValkeyZSetKey.UnfilteredEvent, this.playId),
            ObjectType.ZSET,
        );
        const fEvents = await this.getAllKeys(
            genKey(ValkeyZSetKey.FilteredEvent, this.playId),
            ObjectType.ZSET,
        );
        const events = await this.getAllKeys(
            genKey(ValkeyKey.Event, this.playId, "*"),
        );
        const startpoints = await this.getAllKeys(
            genKey(ValkeyKey.StartPoint, this.playId, "*"),
        );
        const startpointsByFrame = await this.getAllKeys(
            genKey(ValkeyZSetKey.StartPointByFrame, this.playId),
            ObjectType.ZSET,
        );
        const startpointsByTimestamp = await this.getAllKeys(
            genKey(ValkeyZSetKey.StartPointByTimestamp, this.playId),
            ObjectType.ZSET,
        );
        await Promise.all(
            [
                tokens,
                ufEvents,
                fEvents,
                events,
                startpoints,
                startpointsByFrame,
                startpointsByTimestamp,
            ].map(async (list) => await this._valkey.del(list)),
        );
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
        await this._valkey.set(
            genKey(ValkeyKey.Token, this.playId, token),
            permissionType,
        );
        return token;
    }

    _toTickList(
        from: number,
        to: number,
        evList: { tick: number; event: Event }[],
    ) {
        const tickList: Tick[] = [];
        let eIdx = 0;
        for (let frame = from; frame <= to; frame++) {
            let evs: Event[] = [];
            for (; eIdx < evList.length; eIdx++) {
                if (frame < evList[eIdx].tick) {
                    break;
                }
                if (frame === evList[eIdx].tick) {
                    evs.push(evList[eIdx].event);
                }
            }
            const tick: Tick = evs.length === 0 ? [frame] : [frame, evs];
            tickList.push(tick);
        }
        return tickList;
    }

    /**
     * null な ev はデータ不整合が起きていることを示すので、念の為ログにだす
     */
    _warnIfNotFoundEventRecord(
        opts: GetTickListOptions,
        eventList: {
            tick: number;
            eventId: number;
            event: GlideString | null;
        }[],
    ) {
        const notFoundEvents = eventList.filter(({ event }) => event == null);
        if (notFoundEvents.length > 0) {
            const sourceZsetKey = opts.excludeEventFlags?.ignorable
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
        if (convertTickPack.isNumber(tickPack)) {
            if (tickPack <= this._latestTickFrame) {
                // illegal age tick
                return;
            }
            this._latestTickFrame = tickPack;
        } else if (convertTickPack.isTickFrame(tickPack)) {
            if (tickPack.to <= this._latestTickFrame) {
                // illegal age tick
                return;
            }
            this._latestTickFrame = tickPack.to;
        } else if (convertTickPack.isTick(tickPack)) {
            if (tickPack[TickIndex.Frame] <= this._latestTickFrame) {
                // illegal age tick
                return;
            }
            this._latestTickFrame = tickPack[TickIndex.Frame];
            if (tickPack[TickIndex.Events]) {
                const unfilteredEvents = this._genEventIds(
                    tickPack[TickIndex.Events].filter(
                        (event) =>
                            !(
                                event[EventIndex.EventFlags] &
                                EventFlagsMask.Transient
                            ),
                    ),
                );
                await this._storeUnfilteredEvents(
                    tickPack[TickIndex.Frame],
                    unfilteredEvents,
                );
                const filteredEvents = unfilteredEvents.filter(
                    ({ event }) =>
                        !(
                            event[EventIndex.EventFlags] &
                            EventFlagsMask.Ignorable
                        ),
                );
                await this._storeFilteredEvents(
                    tickPack[TickIndex.Frame],
                    filteredEvents,
                );
                await this._storeEvents(unfilteredEvents);
                this._nextUnfilteredEventId += unfilteredEvents.length;
            }
        }
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
                    genKey(ValkeyZSetKey.UnfilteredEvent, this.playId),
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
                    genKey(ValkeyZSetKey.FilteredEvent, this.playId),
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
        await Promise.all(
            events.map(
                async ({ event, id }) =>
                    await this._valkey.set(
                        genKey(ValkeyKey.Event, this.playId, parseInt(id)),
                        JSON.stringify(event),
                    ),
            ),
        );
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
            genKey(ValkeyKey.StartPoint, this.playId, id),
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

    async getAllKeys(match: string, type: ObjectType = ObjectType.STRING) {
        const keys: GlideString[] = [];
        let cursor = "0";
        do {
            const res = await this._valkey.scan(cursor, {
                match,
                type,
            });
            cursor = res[0].toString();
            keys.push(...res[1]);
        } while (cursor !== "0");
        return keys;
    }
}
