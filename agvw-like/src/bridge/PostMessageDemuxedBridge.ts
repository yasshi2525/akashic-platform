import { BridgeMessage } from "./BridgeMessage";
import {
    PostMessageBridgeBase,
    SourceWithOrigin,
    RawMessageEventData,
} from "./PostMessageBridgeBase";

type BeforeDestroyHandler = (self: PostMessageDemuxedBridge) => void;

export class PostMessageDemuxedBridge extends PostMessageBridgeBase {
    selfKey: string;
    _isConnected: boolean;
    _handleBeforeDestroyFunc: BeforeDestroyHandler;

    constructor(
        selfKey: string,
        target: SourceWithOrigin,
        beforeDestory: BeforeDestroyHandler,
    ) {
        super(target);
        this.selfKey = selfKey;
        this._isConnected = false;
        this._handleBeforeDestroyFunc = beforeDestory;
        this.once(BridgeMessage.Init, (_, cb) => {
            if (cb) {
                cb(null, this.selfKey);
                this._isConnected = true;
            }
        });
    }

    override destroy() {
        this._handleBeforeDestroyFunc(this);
        super.destroy();
        this._isConnected = false;
        this._handleBeforeDestroyFunc = null!;
    }

    initialize(e: () => void) {
        if (this._isConnected) {
            this._setImmediate(e);
        } else {
            this.once(BridgeMessage.Init, () => e());
        }
    }

    processRawMessageEvent(e: MessageEvent<RawMessageEventData>) {
        this._handleRawMessageEvent(e);
    }
}
