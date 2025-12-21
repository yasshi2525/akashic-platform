import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { AMFlowServer } from "./AMFlowServer";
import { initializeSocket } from "./initializeSocket";

interface SocketServerParameterObject {
    http: HttpServer;
    amfServer: AMFlowServer;
    /**
     * if undefined or empty array, skip setting cors.
     */
    allowOrigins?: string[];
}

export class SocketServer {
    _http: HttpServer;
    _amfServer: AMFlowServer;
    _server: Server;

    constructor(param: SocketServerParameterObject) {
        this._http = param.http;
        this._amfServer = param.amfServer;
        this._server = this._createServer(param.allowOrigins);
    }

    _createServer(allowOrigins: string[] | undefined) {
        const io = new Server(
            this._http,
            allowOrigins && allowOrigins.length > 0
                ? {
                      cors: {
                          origin: allowOrigins,
                      },
                  }
                : undefined,
        );
        io.on("connection", (socket) => {
            initializeSocket(socket, this._amfServer);
        });
        return io;
    }
}
