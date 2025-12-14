import { SocketOptions } from "socket.io-client";

export interface PlayInfo {
    playId: number;
    playToken: string;
}

export interface SessionOptions {
    /**
     * {@link ProtocolType}
     */
    socketType: number;
    validationData: PlayInfo;
    socketOpts: SocketOptions | null;
}
