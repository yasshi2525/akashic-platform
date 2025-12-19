import type {
    GetStartPointOptions,
    GetTickListOptions,
    Permission,
    StartPoint,
} from "@akashic/amflow";
import type { Event, Tick, TickList } from "@akashic/playlog";

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
    [cliEvMap.Open]: (playId: string, cb: (err: Error | null) => void) => {},
    [cliEvMap.Close]: (playId: string, cb: (err: Error | null) => void) => {},
    [cliEvMap.Authenticate]: (
        playId: string,
        token: string,
        cb: (err: Error | null, permission: Permission | undefined) => void,
    ) => {},
    [cliEvMap.SendTick]: (playId: string, tick: Tick) => {},
    [cliEvMap.SubscribeTick]: () => {},
    [cliEvMap.UnsubscribeTick]: () => {},
    [cliEvMap.SendEvent]: (playId: string, event: Event) => {},
    [cliEvMap.SubscribeEvent]: () => {},
    [cliEvMap.UnsubscribeEvent]: () => {},
    [cliEvMap.GetTickList]: (
        playId: string,
        opts: GetTickListOptions,
        cb: (err: Error | null, tickList: TickList | undefined) => void,
    ) => {},
    [cliEvMap.PutStartPoint]: (
        playId: string,
        startPoint: StartPoint,
        cb: (err: Error | null) => void,
    ) => {},
    [cliEvMap.GetStartPoint]: (
        playId: string,
        opts: GetStartPointOptions,
        cb: (err: Error | null, startPoint: StartPoint | undefined) => void,
    ) => {},
} as const satisfies Record<ClientEvent, unknown>;

export type ClientEventSchema = typeof cliSchema;

const srvSchema = {
    [srvEvMap.Tick]: (tick: Tick) => {},
    [srvEvMap.Event]: (event: Event) => {},
} as const satisfies Record<ServerEvent, unknown>;

export type ServerEventSchema = typeof srvSchema;
