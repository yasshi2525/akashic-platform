import { io, Socket, SocketOptions } from "socket.io-client";
import type { AMFlow } from "@akashic/amflow";
import { ProtocolType } from "./akashic-gameview";
import { PlayInfo, SessionOptions } from "./parameters";
import { CreateClientParameterObject, Session } from "./Session";
import { AMFlowClient } from "./AMFlowClient";

export class SessionLike implements Session {
    _url: string;
    _validationData: PlayInfo;
    _socketOptions: SocketOptions | null;
    _errorListeners: ((err: Error) => void)[] = [];
    _socket: Socket | null;

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
    }

    open(cb: (err: Error | null) => void) {
        this._socket = this._socketOptions
            ? io(this._url, this._socketOptions)
            : io(this._url);
        this._socket.io.on("open", () => {
            cb(null);
        });
        this._socket.io.on("error", (err) => {
            for (const cb of this._errorListeners) {
                cb(err);
            }
        });
    }

    on(type: string, cb: (err: Error) => void): void {
        if (type !== "error") {
            throw new Error(`unsupported event type = ${type}`);
        }
        this._errorListeners.push(cb);
    }

    close(cb: (msg: string) => void): void {
        if (!this._socket) {
            cb("socket is not initialized.");
            return;
        }
        this._socket.on("disconnect", (reason) => {
            cb(reason);
        });
        this._socket.disconnect();
    }

    createClient(
        opts: CreateClientParameterObject,
        cb: (err: Error | null, client: AMFlow | null) => void,
    ): void {
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
