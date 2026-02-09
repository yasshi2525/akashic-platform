import type { Server as HttpServer } from "node:http";
import { Server, ServerOptions } from "socket.io";
import { AMFlowServerManager } from "./AMFlowServerManager";
import { initializeSocket } from "./initializeSocket";

interface SocketServerParameterObject {
    basePath: string;
    http: HttpServer;
    amfManager: AMFlowServerManager;
    /**
     * if undefined or empty array, skip setting cors.
     */
    allowOrigins?: string[];
}

export class SocketServer {
    _basePath: string;
    _http: HttpServer;
    _amfManager: AMFlowServerManager;
    _server: Server;

    constructor(param: SocketServerParameterObject) {
        this._basePath = param.basePath;
        this._http = param.http;
        this._amfManager = param.amfManager;
        this._server = this._createServer(param.allowOrigins);
    }

    _createServer(allowOrigins: string[] | undefined) {
        const opts: Partial<ServerOptions> = {};
        if (this._basePath.endsWith("/")) {
            opts.path = `${this._basePath}socket.io`;
        } else {
            opts.path = `${this._basePath}/socket.io`;
        }
        if (allowOrigins && allowOrigins.length > 0) {
            opts.cors = {
                origin: allowOrigins,
            };
        }
        const io = new Server(this._http, opts);
        io.on("connection", (socket) => {
            initializeSocket(socket, this._amfManager);
        });
        return io;
    }
}
