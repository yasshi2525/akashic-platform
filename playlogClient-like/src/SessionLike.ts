import { io, Socket, SocketOptions } from "socket.io-client";
import type { AMFlow } from "@akashic/amflow";
import { ProtocolType } from "./akashic-gameview";
import { AMFlowClient } from "./AMFlowClient";

export interface CreateClientParameterObject {
    usePrimaryChannel: boolean;
}

export interface PlayInfo {
    playId: string;
    token: string;
}

export interface SessionOptions {
    /**
     * {@link ProtocolType}
     */
    socketType: number;
    validationData: PlayInfo;
    socketOpts?: SocketOptions | null;
}

export class SessionLike {
    _url: string;
    _validationData: PlayInfo;
    _socketOptions: SocketOptions | null | undefined;
    _errorListeners: ((err: Error) => void)[] = [];
    _socket: Socket | null;
    _onErrorBound: (err: Error) => void;

    constructor(url: string, opts: SessionOptions) {
        if (opts.socketType !== ProtocolType.WebSocket) {
            throw new Error(
                `unsupported socket type value = ${opts.socketType}`,
            );
        }
        this._url = url;
        this._validationData = opts.validationData;
        this._socketOptions = opts.socketOpts;
        this._socket = null;
        this._onErrorBound = this._onError.bind(this);
    }

    open(cb: (err: Error | null) => void) {
        if (this._socket) {
            cb(new Error("socket was already connetcted."));
            return;
        }
        this._socket = this._socketOptions
            ? io(this._url, this._socketOptions)
            : io(this._url);
        this._socket.io.on("open", () => {
            cb(null);
        });
        this._socket.io.on("error", this._onErrorBound);
    }

    on(type: "error", cb: (err: Error) => void) {
        if (type !== "error") {
            throw new Error(`unsupported event type = ${type}`);
        }
        this._errorListeners.push(cb);
    }

    close(cb: (msg: string) => void) {
        if (!this._socket) {
            cb("socket was already disconnected.");
            return;
        }
        this._socket.io.off("error", this._onErrorBound);
        this._socket.on("disconnect", (reason) => {
            cb(reason);
            this._socket = null;
        });
        this._socket.disconnect();
    }

    createClient(
        opts: CreateClientParameterObject,
        cb: (err: Error | null, client: AMFlow | null) => void,
    ) {
        if (!this._socket) {
            cb(new Error("socket was already disconnected."), null);
        }
        const client = new AMFlowClient({ socket: this._socket! });
        cb(null, client);
    }

    _onError(err: Error) {
        for (const cb of this._errorListeners) {
            cb(err);
        }
    }
}
