import type {
    GetStartPointOptions,
    GetTickListOptions,
    Permission,
    StartPoint,
} from "@akashic/amflow";
import type { Event, Tick, TickList } from "@akashic/playlog";
import { AMFlowError } from "./error";

const cliEvents = [
    "amf:open",
    "amf:close",
    "amf:authenticate",
    "amf:sendTick",
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
    SendTick: "amf:sendTick",
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

const srvEvents = ["amf:[t]", "amf:[e]"] as const;

export type ServerEvent = (typeof srvEvents)[number];

export const srvEvMap = {
    Tick: "amf:[t]",
    Event: "amf:[e]",
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
        cb: (
            err: AMFlowError | null,
            permission: Permission | undefined,
        ) => void,
    ) => {},
    [cliEvMap.SendTick]: (tick: Tick) => {},
    [cliEvMap.SubscribeTick]: () => {},
    [cliEvMap.UnsubscribeTick]: () => {},
    [cliEvMap.SendEvent]: (event: Event) => {},
    [cliEvMap.SubscribeEvent]: () => {},
    [cliEvMap.UnsubscribeEvent]: () => {},
    [cliEvMap.GetTickList]: (
        opts: GetTickListOptions,
        cb: (
            err: AMFlowError | null,
            tickList: TickList | null | undefined,
        ) => void,
    ) => {},
    [cliEvMap.PutStartPoint]: (
        startPoint: StartPoint,
        cb: (err: AMFlowError | null) => void,
    ) => {},
    [cliEvMap.GetStartPoint]: (
        opts: GetStartPointOptions,
        cb: (
            err: AMFlowError | null,
            startPoint: StartPoint | null | undefined,
        ) => void,
    ) => {},
} as const satisfies Record<ClientEvent, unknown>;

export type ClientEventSchema = typeof cliSchema;

const srvSchema = {
    [srvEvMap.Tick]: (tick: Tick) => {},
    [srvEvMap.Event]: (event: Event) => {},
} as const satisfies Record<ServerEvent, unknown>;

export type ServerEventSchema = typeof srvSchema;
