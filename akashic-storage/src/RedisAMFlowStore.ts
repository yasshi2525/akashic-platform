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
import { BadRequestError } from "@yasshi2525/amflow-server-event-schema";
import { RedisConnection } from "./createRedisConnection";
import {
    genKey,
    PermissionType,
    RedisKey,
    RedisZSetKey,
    toPermission,
} from "./redisSchema";
import { AMFlowStoreBase } from "./AMFlowStoreBase";

interface RedisAMFlowStoreParameterObject {
    redis: RedisConnection;
    playId: string;
}

export class RedisAMFlowStore extends AMFlowStoreBase {
    _redis: RedisConnection;
    _latestTickFrame: number;
    _nextUnfilteredEventId: number;
    _nextSnapshotId: number;
    _isDestroyed: boolean;

    constructor(param: RedisAMFlowStoreParameterObject) {
        super(param.playId);
        this._redis = param.redis;
        this._latestTickFrame = 0;
        this._nextUnfilteredEventId = 1;
        this._nextSnapshotId = 1;
        this._isDestroyed = false;
    }

    async authenticate(token: string) {
        const permissionType = await this._redis.get(
            genKey(RedisKey.Token, this.playId, token),
        );
        if (!permissionType) {
            throw new BadRequestError("invalid token");
        }
        return toPermission(permissionType as PermissionType);
    }

    async sendTick(tick: Tick) {
        await this._pushTick(tick);
        this._sendTick(tick);
    }

    async getTickList(opts: GetTickListOptions): Promise<TickList | null> {
        const from = opts.begin;
        const to = Math.min(opts.end - 1, this._latestTickFrame);
        if (to < from) {
            return null;
        }
        const scores = opts.excludeEventFlags?.ignorable
            ? await this._redis.zRangeByScoreWithScores(
                  genKey(RedisZSetKey.FilteredEvent, this.playId),
                  from,
                  to,
              )
            : await this._redis.zRangeByScoreWithScores(
                  genKey(RedisZSetKey.UnfilteredEvent, this.playId),
                  from,
                  to,
              );
        if (scores.length === 0) {
            return [from, to];
        }
        const rawEvList = await Promise.all(
            scores
                .map(({ score, value }) => ({
                    tick: score,
                    eventId: parseInt(value),
                }))
                .map(async ({ tick, eventId }) => ({
                    tick,
                    eventId: eventId,
                    event: await this._redis.get(
                        genKey(RedisKey.Event, this.playId, eventId),
                    ),
                })),
        );
        this._warnIfNotFoundEventRecord(opts, rawEvList);
        const evList = rawEvList
            .filter(({ event }) => !event)
            .map(({ tick, eventId, event }) => {
                try {
                    return {
                        tick,
                        event: JSON.parse(event!) as Event,
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
            .filter(({ event }) => !event) as { tick: number; event: Event }[];
        return [from, to, this._toTickList(from, to, evList)];
    }

    async putStartPoint(startPoint: StartPoint) {
        await this._redis.zAdd(
            genKey(RedisZSetKey.StartPointByFrame, this.playId),
            {
                score: startPoint.frame,
                value: this._nextSnapshotId.toString(),
            },
        );
        await this._redis.zAdd(
            genKey(RedisZSetKey.StartPointByTimestamp, this.playId),
            {
                score: startPoint.timestamp,
                value: this._nextSnapshotId.toString(),
            },
        );
        await this._redis.set(
            genKey(RedisKey.StartPoint, this.playId, this._nextSnapshotId),
            JSON.stringify(startPoint),
        );
        this._nextSnapshotId++;
    }

    async getStartPoint(opts: GetStartPointOptions) {
        const isFirst =
            opts.frame === 0 || (opts.frame == null && opts.timestamp == null);

        if (isFirst) {
            const ids = await this._redis.zRange(
                genKey(RedisZSetKey.StartPointByFrame),
                0,
                0,
            );
            return this._restoreStartPointFromIds(ids);
        } else if (opts.timestamp != null) {
            const ids = await this._redis.zRange(
                genKey(RedisZSetKey.StartPointByTimestamp),
                0,
                "(" + opts.timestamp,
                {
                    BY: "SCORE",
                    REV: true,
                    LIMIT: {
                        offset: 0,
                        count: 1,
                    },
                },
            );
            return this._restoreStartPointFromIds(ids);
        } else if (opts.frame != null) {
            const ids = await this._redis.zRange(
                genKey(RedisZSetKey.StartPointByFrame),
                0,
                opts.frame - 1,
                {
                    BY: "SCORE",
                    REV: true,
                    LIMIT: {
                        offset: 0,
                        count: 1,
                    },
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
        const tokens = await this._redis.keys(
            genKey(RedisKey.Token, this.playId, "*"),
        );
        const ufEvents = await this._redis.keys(
            genKey(RedisZSetKey.UnfilteredEvent, this.playId, "*"),
        );
        const fEvents = await this._redis.keys(
            genKey(RedisZSetKey.FilteredEvent, this.playId, "*"),
        );
        const events = await this._redis.keys(
            genKey(RedisKey.Event, this.playId, "*"),
        );
        const startpoints = await this._redis.keys(
            genKey(RedisKey.StartPoint, this.playId, "*"),
        );
        const startpointsByFrame = await this._redis.keys(
            genKey(RedisZSetKey.StartPointByFrame, this.playId, "*"),
        );
        const startpointsByTimestamp = await this._redis.keys(
            genKey(RedisZSetKey.StartPointByTimestamp, this.playId, "*"),
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
            ]
                .flat()
                .map(async (key) => await this._redis.del(key)),
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
        await this._redis.set(
            genKey(RedisKey.Token, this.playId, token),
            permissionType,
        );
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
        eventList: { tick: number; eventId: number; event: string | null }[],
    ) {
        const notFoundEvents = eventList.filter(({ event }) => event == null);
        if (notFoundEvents.length > 0) {
            const sourceZsetKey = opts.excludeEventFlags?.ignorable
                ? RedisZSetKey.FilteredEvent
                : RedisZSetKey.UnfilteredEvent;
            console.warn(
                `following id does not exist in ${RedisKey.Event} even though ${sourceZsetKey} refer`,
                notFoundEvents.map(
                    ({ tick, eventId }) =>
                        `:${eventId} (playId = ${this.playId}, tick = ${tick})`,
                ),
            );
        }
    }

    async _pushTick(tick: Tick) {
        if (tick[TickIndex.Frame] <= this._latestTickFrame) {
            // illegal age tick
            return;
        }
        this._latestTickFrame = tick[TickIndex.Frame];

        if (tick[TickIndex.Events]) {
            const unfilteredEvents = this._genEventIds(
                tick[TickIndex.Events].filter(
                    (event) =>
                        !(
                            event[EventIndex.EventFlags] &
                            EventFlagsMask.Transient
                        ),
                ),
            );
            await this._storeUnfilteredEvents(
                tick[TickIndex.Frame],
                unfilteredEvents,
            );
            const filteredEvents = unfilteredEvents.filter(
                ({ event }) =>
                    !(event[EventIndex.EventFlags] & EventFlagsMask.Ignorable),
            );
            await this._storeFilteredEvents(
                tick[TickIndex.Frame],
                filteredEvents,
            );
            await this._storeEvents(unfilteredEvents);
            this._nextUnfilteredEventId += unfilteredEvents.length;
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
                await this._redis.zAdd(
                    genKey(RedisZSetKey.UnfilteredEvent, this.playId),
                    {
                        score: tick,
                        value: id,
                    },
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
                await this._redis.zAdd(
                    genKey(RedisZSetKey.FilteredEvent, this.playId),
                    {
                        score: tick,
                        value: id,
                    },
                );
            }),
        );
    }

    async _storeEvents(events: { event: Event; id: string }[]) {
        await Promise.all(
            events.map(
                async ({ event, id }) =>
                    await this._redis.set(
                        genKey(RedisKey.Event, this.playId, parseInt(id)),
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

    async _restoreStartPointFromIds(ids: string[]) {
        if (ids.length === 0) {
            return null;
        } else {
            return await this._restoreStartPoint(parseInt(ids[0]));
        }
    }

    async _restoreStartPoint(id: number) {
        const startpoint = await this._redis.get(
            genKey(RedisKey.StartPoint, this.playId, id),
        );
        if (startpoint == null) {
            console.warn(
                `${id} does not exist in ${RedisKey.StartPoint} even though zset refer`,
            );
            return null;
        }
        try {
            // 解析に失敗した場合、その前のStartPointを取得しリトライする戦法も考えられるが、
            // 異常系のため StartPoint なし として結果を返す
            return JSON.parse(startpoint) as StartPoint;
        } catch (err) {
            console.warn(
                `failed to parse startpoint "${startpoint}" (playId = ${this.playId}, startpointId = ${id})`,
            );
            return null;
        }
    }
}
