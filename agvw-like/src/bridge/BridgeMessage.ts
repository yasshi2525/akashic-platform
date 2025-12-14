export const BridgeMessage = {
    Init: "bridge:init",
} as const;

export const BridgeAMFlowMessage = {
    Open: "amf:open",
    Close: "amf:close",
    Authenticate: "amf:authenticate",
    SendTick: "amf:sendTick",
    SubscribeTick: "amf:subscribeTick",
    UnsubscribeTick: "amf:unsubscribeTick",
    ReceiveTick: "amf:[t]",
    SendEvent: "amf:sendEvent",
    SubscribeEvent: "amf:subscribeEvent",
    UnsubscribeEvent: "amf:unsubscribeEvent",
    ReceiveEvent: "amf:[e]",
    GetTickList: "amf:getTickList",
    PutStartPoint: "amf:putStartPoint",
    GetStartPoint: "amf:getStartPoint",
} as const;
