import type { Socket } from "socket.io";
import type { GlideClient } from "@valkey/valkey-glide";
import {
    InvalidStatusError,
    PlayEndReason,
} from "@yasshi2525/amflow-server-event-schema";
import { ValkeyAMFlowStore } from "./ValkeyAMFlowStore";
import { AMFlowServer } from "./AMFlowServer";

interface AMFlowServerManagerParameterObject {
    valkey: GlideClient;
}

export class AMFlowServerManager {
    _valkey: GlideClient;
    _servers: Map<string, AMFlowServer>;
    _clients: Set<Socket>;

    constructor(param: AMFlowServerManagerParameterObject) {
        this._valkey = param.valkey;
        this._servers = new Map();
        this._clients = new Set();
    }

    start(playId: string) {
        if (this._servers.has(playId)) {
            throw new Error(`playId "${playId}" was already started.`);
        }
        const server = new AMFlowServer({
            playId,
            store: new ValkeyAMFlowStore({
                playId,
                valkey: this._valkey,
            }),
        });
        this._servers.set(playId, server);
        return server;
    }

    async end(playId: string, reason: PlayEndReason) {
        await this._servers.get(playId)?.destroy(reason);
        this._servers.delete(playId);
    }

    getServer(playId: string) {
        const server = this._servers.get(playId);
        if (!server) {
            console.warn(`invalid playId "${playId}" was specified.`);
            throw new InvalidStatusError("invalid playId was specified.");
        }
        return server;
    }

    async destroy() {
        await Promise.all(
            [...this._servers.values()].map(async (server) => {
                console.log(
                    `server (playId = ${server._playId}) is destroying forcibly.`,
                );
                await server.destroy("INTERNAL_ERROR");
            }),
        );
        for (const client of this._clients) {
            client.disconnect(true);
        }
        this._clients.clear();
        this._servers.clear();
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
