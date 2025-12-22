import type { Socket } from "socket.io";
import { RedisConnection } from "./createRedisConnection";
import { RedisAMFlowStore } from "./RedisAMFlowStore";
import { AMFlowServer } from "./AMFlowServer";

interface AMFlowServerManagerParameterObject {
    redis: RedisConnection;
}

export class AMFlowServerManager {
    _redis: RedisConnection;
    _servers: Map<string, AMFlowServer>;
    _clients: Set<Socket>;

    constructor(param: AMFlowServerManagerParameterObject) {
        this._redis = param.redis;
        this._servers = new Map();
        this._clients = new Set();
    }

    start(playId: string) {
        if (this._servers.has(playId)) {
            throw new Error(`playId "${playId}" was already started.`);
        }
        const server = new AMFlowServer({
            playId,
            store: new RedisAMFlowStore({
                playId,
                redis: this._redis,
            }),
        });
        this._servers.set(playId, server);
        return server;
    }

    async end(playId: string) {
        await this._servers.get(playId)?.destroy();
        this._servers.delete(playId);
    }

    getServer(playId: string) {
        const server = this._servers.get(playId);
        if (!server) {
            throw new Error(`unregistered playId "${playId}"`);
        }
        return server;
    }

    async destroy() {
        await Promise.all(
            [...this._servers.values()].map(
                async (server) => await server.destroy(),
            ),
        );
        this._servers.clear();
        for (const client of this._clients) {
            client.disconnect(true);
        }
        this._clients.clear();
    }

    onConnect(socket: Socket) {
        this._clients.add(socket);
    }

    onDisconnect(socket: Socket) {
        for (const server of this._servers.values()) {
            server.leave(socket);
        }
        this._clients.delete(socket);
    }
}
