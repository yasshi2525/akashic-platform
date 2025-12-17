import { BridgeMessage } from "./BridgeMessage";
import { RawMessageEventData } from "./PostMessageBridgeBase";
import { PostMessageDemuxedBridge } from "./PostMessageDemuxedBridge";

const findIndex = <T>(arr: T[], predicate: (elm: T) => boolean) => {
    for (var r = 0; r < arr.length; r++) {
        if (predicate(arr[r])) {
            return r;
        }
    }
    return -1;
};

interface PostMessageEventData extends RawMessageEventData {
    key: string;
}

type RegisterCallback = (
    err: Error | null,
    bridge: PostMessageDemuxedBridge | undefined,
) => void;

export class PostMessageBridgeDemux {
    _waitingEvents: MessageEvent<PostMessageEventData>[];
    _targetIndex: number;
    _bridgeTable: Record<string, PostMessageDemuxedBridge>;
    _window: Window;
    _trustedOriginRegExp: RegExp | undefined;
    _handleMessage_bound: (ev: MessageEvent<PostMessageEventData>) => void;
    _handleDestroyBridge_bound: (bridge: PostMessageDemuxedBridge) => void;

    constructor(win: Window, trustedOriginRegExp: RegExp | undefined) {
        this._waitingEvents = [];
        this._targetIndex = 0;
        this._bridgeTable = {};
        this._window = win;
        this._trustedOriginRegExp = trustedOriginRegExp;
        this._handleMessage_bound = this._handleMessage.bind(this);
        this._handleDestroyBridge_bound = this._handleDestroyBridge.bind(this);
        this._window.addEventListener("message", this._handleMessage_bound);
    }

    register(win: Window, targetOrigin: string | null, cb: RegisterCallback) {
        if (
            targetOrigin &&
            this._trustedOriginRegExp &&
            this._trustedOriginRegExp.test(targetOrigin)
        ) {
            const bridge = this.findBridge(win);
            if (bridge) {
                this._setImmediate(() => {
                    if (bridge.getTarget().targetOrigin !== targetOrigin) {
                        cb(
                            new Error(
                                `PostMessageBridgeDemux#register(): targetOrigin mismatch: ${targetOrigin}`,
                            ),
                            undefined,
                        );
                    } else {
                        cb(null, bridge);
                    }
                });
            } else {
                const selfKey = `PDBT${this._targetIndex++}`;
                const newBridge = new PostMessageDemuxedBridge(
                    selfKey,
                    { targetOrigin, window: win },
                    this._handleDestroyBridge_bound,
                );
                this._bridgeTable[selfKey] = newBridge;
                const idx = findIndex(
                    this._waitingEvents,
                    (ev) => ev.source === win,
                );
                if (idx !== -1) {
                    const ev = this._waitingEvents.splice(idx, 1)[0];
                    newBridge.processRawMessageEvent(ev);
                }
                newBridge.initialize(() => cb(null, newBridge));
            }
        } else {
            this._setImmediate(() =>
                cb(
                    new Error(
                        `PostMessageDemuxedBridge#register(): untrusted origin: ${targetOrigin}`,
                    ),
                    undefined,
                ),
            );
        }
    }

    destroy() {
        Object.keys(this._bridgeTable).forEach((key) =>
            this._bridgeTable[key].destroy(),
        );
        this._window.removeEventListener("message", this._handleMessage_bound);
        this._window = null!;
        this._waitingEvents = null!;
        this._bridgeTable = null!;
        this._trustedOriginRegExp = null!;
        this._handleMessage_bound = null!;
        this._handleDestroyBridge_bound = null!;
    }

    findBridge(source: MessageEventSource | null) {
        const keys = Object.keys(this._bridgeTable);
        const idx = findIndex(
            keys,
            (key) => this._bridgeTable[key].getTarget().window === source,
        );
        if (idx !== -1) {
            return this._bridgeTable[keys[idx]];
        } else {
            return null;
        }
    }

    _handleDestroyBridge(bridge: PostMessageDemuxedBridge) {
        delete this._bridgeTable[bridge.selfKey];
    }

    _handleMessage(ev: MessageEvent<PostMessageEventData>) {
        if (
            this._trustedOriginRegExp &&
            this._trustedOriginRegExp.test(ev.origin)
        ) {
            const bridge =
                !ev.data.key && ev.data.type === BridgeMessage.Init
                    ? this.findBridge(ev.source)
                    : this._bridgeTable[ev.data.key];
            if (bridge) {
                bridge.processRawMessageEvent(ev);
            } else if (!ev.data.key) {
                this._waitingEvents.push(ev);
            }
        }
    }

    _setImmediate(e: Function) {
        setTimeout(e, 0);
    }
}
