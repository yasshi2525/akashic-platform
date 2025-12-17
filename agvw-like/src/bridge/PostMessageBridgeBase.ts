import type { LoaderMessage } from "./LoaderMessage";

export interface SourceWithOrigin {
    window: Window;
    targetOrigin: string;
}

interface RequestMessage {
    reqId: string;
    /**
     * {@link LoaderMessage}
     */
    type: string;
    data: unknown;
}

interface SendMessage {
    type: string;
    data: unknown;
}

interface ResponseMessage {
    resId: string;
    data: unknown;
    errorMessage: string | undefined;
}

/**
 * NOTE: 第二引数は正確には data?: だが、転記ミスを防止するためあえて存在するようにしている
 */
export type RawMessageEventDataCallback = (
    errorMessage: string | null | undefined,
    data: unknown | undefined,
) => void;

export interface RawMessageEventData {
    reqId: string;
    resId: string;
    type: string;
    data: string;
    errorMessage: string;
}

/**
 * NOTE: data は string だったり object だったり。ジェネリクスにしたいが、様々なデータを一つのクラスで処理しているので一旦unknown
 * NOTE: reqId が存在しないとき undefined。 cb? でもよいが、転記ミスを防ぐため必須パラメタにしている
 */
export type RawMessageEventDataHandler = (
    data: unknown,
    cb: RawMessageEventDataCallback | undefined,
) => void;

interface HandlerEntry {
    handler: RawMessageEventDataHandler | null;
    isOnce: boolean;
}

type RequestHandler = (err: Error | null, data: unknown) => void;

export class PostMessageBridgeBase {
    _requestIndex: number;
    _requestHandlersTable: Record<string, RequestHandler>;
    _handlersTable: Record<string, HandlerEntry[]>;
    _target: SourceWithOrigin;

    constructor(target: SourceWithOrigin) {
        this._requestIndex = 0;
        this._requestHandlersTable = {};
        this._handlersTable = {};
        this._target = target;
    }

    getTarget() {
        return this._target;
    }

    /**
     * @param type {@link LoaderMessage}
     */
    request(type: string, data: unknown, reqHandler: RequestHandler) {
        const reqId = `req${this._requestIndex++}`;
        const msg: RequestMessage = { type, data, reqId };
        this._target.window.postMessage(msg, this._target.targetOrigin);
        this._requestHandlersTable[reqId] = reqHandler;
    }

    send(type: string, data: unknown) {
        const msg: SendMessage = { type, data };
        this._target.window.postMessage(msg, this._target.targetOrigin);
    }

    /**
     * @param type {@link LoaderMessage}
     */
    on(type: string, handler: RawMessageEventDataHandler) {
        const table = this._handlersTable;
        if (!table[type]) {
            table[type] = [];
        }
        table[type].push({ handler, isOnce: false });
    }

    /**
     * @param type {@link LoaderMessage}
     */
    once(type: string, handler: RawMessageEventDataHandler) {
        const table = this._handlersTable;
        if (!table[type]) {
            table[type] = [];
        }
        table[type].push({ handler, isOnce: true });
    }

    /**
     * @param type {@link LoaderMessage}
     */
    off(type: string, handler: RawMessageEventDataHandler | null) {
        const table = this._handlersTable;
        if (table[type] && table[type].length > 0) {
            table[type] = table[type].filter((e) => e.handler !== handler);
        }
    }

    _respond(
        resId: string,
        errorMessage: string | null | undefined,
        data: unknown,
    ) {
        const msg: ResponseMessage = {
            resId,
            data,
            errorMessage: errorMessage ?? undefined,
        };
        this._target.window.postMessage(msg, this._target.targetOrigin);
    }

    _handleRawMessageEvent(ev: MessageEvent<RawMessageEventData>) {
        const evData = ev.data;
        if (ev.source === this._target.window) {
            const resId = evData.resId;
            // おそらく resId は "" でないはずだが、元のコードにあわせて null 比較している
            if (resId != null) {
                const reqHandler = this._requestHandlersTable[resId];
                delete this._requestHandlersTable[resId];
                reqHandler(
                    evData.errorMessage ? new Error(evData.errorMessage) : null,
                    evData.data,
                );
                return;
            }
            const table = this._handlersTable;
            const type = evData.type;
            if (type && table && table[type] && table[type].length > 0) {
                const entries = [...table[type]];
                const reqId = evData.reqId;
                let cb: RawMessageEventDataCallback | undefined;
                // おそらく reqId は "" でないはずだが、元のコードにあわせて null 比較している
                if (reqId != null) {
                    cb = (errMsg, data) => this._respond(reqId, errMsg, data);
                }
                let isDeleted = false;
                for (const entry of entries) {
                    if (entry.handler) {
                        entry.handler(evData.data, cb);
                        if (entry.isOnce) {
                            entry.handler = null;
                            isDeleted = true;
                        }
                    }
                }
                if (isDeleted) {
                    this.off(type, null);
                }
            } else {
                if (evData.reqId == null) {
                    console.warn(
                        "PostMessageBridgeBase: ignored unknown message",
                        evData,
                    );
                } else {
                    this._respond(
                        evData.reqId,
                        "No corresponding handler",
                        null,
                    );
                }
            }
        } else {
            console.warn(
                `PostMessageBridgeBase: got ${JSON.stringify(evData)} from unknown source`,
            );
        }
    }

    _setImmediate(e: Function) {
        setTimeout(e, 0);
    }

    // NOTE: _createRawMessageBase は ただ {} を返すだけで保守性を下げると判断し、削除

    destroy() {
        this._target = null!;
        this._requestHandlersTable = null!;
        this._handlersTable = null!;
    }
}
