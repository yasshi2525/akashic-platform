import { SocketOptions } from "socket.io-client";
import { ProtocolType } from "./akashic-gameview";

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
    socketOpts: SocketOptions | null;
}
