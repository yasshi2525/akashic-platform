import type {
    AMFlow,
    GetStartPointOptions,
    GetTickListOptions,
    StartPoint,
} from "@akashic/amflow";
import type { Event, Tick } from "@akashic/playlog";
import { BridgeAMFlowMessage } from "./BridgeMessage";
import {
    PostMessageBridgeBase,
    RawMessageEventDataHandler,
} from "./PostMessageBridgeBase";

export const setupAMFlowProxy = (
    amflow: AMFlow,
    bridge: PostMessageBridgeBase,
) => {
    // NOTE: RawMessageEventDataHandler をジェネリクスにすると Bridge の構造が複雑になるのでキャストしてる
    const open: RawMessageEventDataHandler = (playId, cb) => {
        amflow.open(
            playId as string,
            (err) => cb && cb(err ? err.message : null, undefined),
        );
    };
    const close: RawMessageEventDataHandler = (_, cb) => {
        amflow.close((err) => cb && cb(err ? err.message : null, undefined));
    };
    const authenticate: RawMessageEventDataHandler = (token, cb) => {
        amflow.authenticate(token as string, (err, permission) => {
            if (cb) {
                if (err) {
                    cb(err.message, undefined);
                } else {
                    cb(null, permission);
                }
            }
        });
    };
    const sendTick: RawMessageEventDataHandler = (tick) => {
        amflow.sendTick(tick as Tick);
    };
    const sendEvent: RawMessageEventDataHandler = (event) => {
        amflow.sendEvent(event as Event);
    };
    const tickHandler = (tick: Tick) => {
        bridge.send(BridgeAMFlowMessage.ReceiveTick, tick);
    };
    const eventHandler = (event: Event) => {
        bridge.send(BridgeAMFlowMessage.ReceiveTick, event);
    };
    const subscribeTick: RawMessageEventDataHandler = () => {
        amflow.onTick(tickHandler);
    };
    const unsubscribeTick: RawMessageEventDataHandler = () => {
        amflow.offTick(tickHandler);
    };
    const subscribeEvent: RawMessageEventDataHandler = () => {
        amflow.onEvent(eventHandler);
    };
    const unsubscribeEvent: RawMessageEventDataHandler = () => {
        amflow.offEvent(eventHandler);
    };
    const getTickList: RawMessageEventDataHandler = (options, cb) => {
        // NOTE: 元のコードは非推奨の呼び出し方をしていたので、推奨の方法にした
        amflow.getTickList(options as GetTickListOptions, (err, tickList) => {
            if (cb) {
                if (err) {
                    cb(err.message, undefined);
                } else {
                    cb(null, tickList);
                }
            }
        });
    };
    const putStartPoint: RawMessageEventDataHandler = (startPoint, cb) => {
        amflow.putStartPoint(
            startPoint as StartPoint,
            (err) => cb && cb(err ? err.message : null, undefined),
        );
    };
    const getStartPoint: RawMessageEventDataHandler = (options, cb) => {
        amflow.getStartPoint(
            options as GetStartPointOptions,
            (err, startPoint) => {
                if (cb) {
                    if (err) {
                        cb(err.message, undefined);
                    } else {
                        cb(null, startPoint);
                    }
                }
            },
        );
    };
    bridge.on(BridgeAMFlowMessage.Open, open);
    bridge.on(BridgeAMFlowMessage.Close, close);
    bridge.on(BridgeAMFlowMessage.Authenticate, authenticate);
    bridge.on(BridgeAMFlowMessage.SendTick, sendTick);
    bridge.on(BridgeAMFlowMessage.SendEvent, sendEvent);
    bridge.on(BridgeAMFlowMessage.SubscribeTick, subscribeTick);
    bridge.on(BridgeAMFlowMessage.UnsubscribeTick, unsubscribeTick);
    bridge.on(BridgeAMFlowMessage.SubscribeEvent, subscribeEvent);
    bridge.on(BridgeAMFlowMessage.UnsubscribeEvent, unsubscribeEvent);
    bridge.on(BridgeAMFlowMessage.GetTickList, getTickList);
    bridge.on(BridgeAMFlowMessage.PutStartPoint, putStartPoint);
    bridge.on(BridgeAMFlowMessage.GetStartPoint, getStartPoint);
    return () => {
        unsubscribeTick(undefined, undefined);
        unsubscribeEvent(undefined, undefined);
        bridge.off(BridgeAMFlowMessage.Open, open);
        bridge.off(BridgeAMFlowMessage.Close, close);
        bridge.off(BridgeAMFlowMessage.Authenticate, authenticate);
        bridge.off(BridgeAMFlowMessage.SendTick, sendTick);
        bridge.off(BridgeAMFlowMessage.SendEvent, sendEvent);
        bridge.off(BridgeAMFlowMessage.SubscribeTick, subscribeTick);
        bridge.off(BridgeAMFlowMessage.UnsubscribeTick, unsubscribeTick);
        bridge.off(BridgeAMFlowMessage.SubscribeEvent, subscribeEvent);
        bridge.off(BridgeAMFlowMessage.UnsubscribeEvent, unsubscribeEvent);
        bridge.off(BridgeAMFlowMessage.GetTickList, getTickList);
        bridge.off(BridgeAMFlowMessage.PutStartPoint, putStartPoint);
        bridge.off(BridgeAMFlowMessage.GetStartPoint, getStartPoint);
    };
};
