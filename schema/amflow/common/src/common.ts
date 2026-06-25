import type {
    GetStartPointOptions,
    GetTickListOptions,
    Permission,
    StartPoint,
} from "@akashic/amflow";
import type { Event, TickList } from "@akashic/playlog";
import { AMFlowError } from "./error";
import { TickPack } from "./tick";

/**
 * 分散トレーシングのコンテキスト（W3C traceparent / X-Amzn-Trace-Id 等）を
 * Socket.IO イベントに載せて伝播するためのキャリア。
 * OpenTelemetry の TextMapPropagator が inject/extract する形式に対応する。
 * トレーシング無効時は空オブジェクトとなり、挙動には影響しない。
 */
export type Carrier = Record<string, string>;

const cliEvents = [
    "amf:open",
    "amf:close",
    "amf:authenticate",
    "amf:sendTickPack",
    "amf:subscribeTick",
    "amf:unsubscribeTick",
    "amf:sendEvent",
    "amf:subscribeEvent",
    "amf:unsubscribeEvent",
    "amf:getTickList",
    "amf:putStartPoint",
    "amf:getStartPoint",
] as const;

export type ClientEvent = (typeof cliEvents)[number];

export const cliEvMap = {
    Open: "amf:open",
    Close: "amf:close",
    Authenticate: "amf:authenticate",
    SendTickPack: "amf:sendTickPack",
    SubscribeTick: "amf:subscribeTick",
    UnsubscribeTick: "amf:unsubscribeTick",
    SendEvent: "amf:sendEvent",
    SubscribeEvent: "amf:subscribeEvent",
    UnsubscribeEvent: "amf:unsubscribeEvent",
    GetTickList: "amf:getTickList",
    PutStartPoint: "amf:putStartPoint",
    GetStartPoint: "amf:getStartPoint",
} as const satisfies Record<string, ClientEvent>;

export type ClientEventName = keyof typeof cliEvMap;

const srvEvents = [
    "amf:[tp]",
    "amf:[e]",
    "amf:playEnd",
    "amf:playExtend",
] as const;

export type ServerEvent = (typeof srvEvents)[number];

export const srvEvMap = {
    TickPack: "amf:[tp]",
    Event: "amf:[e]",
    PlayEnd: "amf:playEnd",
    PlayExtend: "amf:playExtend",
} as const satisfies Record<string, ServerEvent>;

export type ServerEventName = keyof typeof srvEvMap;

const cliSchema = {
    [cliEvMap.Open]: (
        playId: string,
        cb: (err: AMFlowError | null) => void,
    ) => {},
    [cliEvMap.Close]: (cb: (err: AMFlowError | null) => void) => {},
    [cliEvMap.Authenticate]: (
        token: string,
        carrier: Carrier,
        cb: (
            err: AMFlowError | null,
            permission: Permission | undefined,
        ) => void,
    ) => {},
    [cliEvMap.SendTickPack]: (tickPack: TickPack, carrier: Carrier) => {},
    [cliEvMap.SubscribeTick]: () => {},
    [cliEvMap.UnsubscribeTick]: () => {},
    [cliEvMap.SendEvent]: (event: Event) => {},
    [cliEvMap.SubscribeEvent]: () => {},
    [cliEvMap.UnsubscribeEvent]: () => {},
    [cliEvMap.GetTickList]: (
        opts: GetTickListOptions,
        carrier: Carrier,
        cb: (
            err: AMFlowError | null,
            tickList: TickList | null | undefined,
        ) => void,
    ) => {},
    [cliEvMap.PutStartPoint]: (
        startPoint: StartPoint,
        carrier: Carrier,
        cb: (err: AMFlowError | null) => void,
    ) => {},
    [cliEvMap.GetStartPoint]: (
        opts: GetStartPointOptions,
        carrier: Carrier,
        cb: (
            err: AMFlowError | null,
            startPoint: StartPoint | null | undefined,
        ) => void,
    ) => {},
} as const satisfies Record<ClientEvent, unknown>;

export type ClientEventSchema = typeof cliSchema;

const playEndReasons = [
    "GAMEMASTER",
    "TIMEOUT",
    "IDLE",
    "DEL_CONTENT",
    "INTERNAL_ERROR",
] as const;
export type PlayEndReason = (typeof playEndReasons)[number];

export interface PlayExtendPayload {
    expiresAt: number;
    remainingMs: number;
    extendMs: number;
}

const srvSchema = {
    [srvEvMap.TickPack]: (tickPack: TickPack) => {},
    [srvEvMap.Event]: (event: Event) => {},
    [srvEvMap.PlayEnd]: (reason: PlayEndReason) => {},
    [srvEvMap.PlayExtend]: (payload: PlayExtendPayload) => {},
} as const satisfies Record<ServerEvent, unknown>;

export type ServerEventSchema = typeof srvSchema;
