import type { Socket } from "socket.io";
import type { Permission } from "@akashic/amflow";
import type { Event, Tick } from "@akashic/playlog";
import { AMFlowStore } from "@akashic/headless-driver";
import {
    ListenSchema,
    EmitSchema,
    EmitEvent,
} from "@yasshi2525/amflow-server-event-schema";

const activePermission: Permission = {
    readTick: true,
    writeTick: true,
    sendEvent: true,
    subscribeEvent: true,
    subscribeTick: true,
    maxEventPriority: 2,
};

const passivePermission: Permission = {
    readTick: true,
    writeTick: false,
    sendEvent: true,
    subscribeEvent: false,
    subscribeTick: true,
    maxEventPriority: 2,
};

export class AMFlowServer {
    _stores: Map<string, AMFlowStore>;
    _tickBroadcaster: Map<string, (tick: Tick) => void>;
    _eventBroadcaster: Map<string, (event: Event) => void>;
    _clients: Map<string, Set<Socket<ListenSchema, EmitSchema>>>;

    constructor() {
        this._stores = new Map();
        this._clients = new Map();
        this._tickBroadcaster = new Map();
        this._eventBroadcaster = new Map();
    }

    start(playId: string) {
        if (this._clients.has(playId) || this._stores.has(playId)) {
            throw new Error(`playId "${playId}" was already started.`);
        }
        this._clients.set(playId, new Set());
        this._stores.set(playId, this._createStore(playId));
    }

    end(playId: string) {
        this._stores.get(playId)?.destroy();
        this._stores.delete(playId);
        this._tickBroadcaster.delete(playId);
        this._eventBroadcaster.delete(playId);
        this._clients.delete(playId);
    }

    generateToken(playId: string, isActive: boolean) {
        return this.getStore(playId).createPlayToken(
            isActive ? activePermission : passivePermission,
        );
    }

    join(playId: string, socket: Socket) {
        this._getClients(playId).add(socket);
    }

    leave(playId: string, socket: Socket) {
        this._getClients(playId).delete(socket);
    }

    getStore(playId: string) {
        const store = this._stores.get(playId);
        if (!store) {
            throw new Error(`unregistered playId "${playId}"`);
        }
        return store;
    }

    destroy() {
        for (const store of this._stores.values()) {
            store.destroy();
        }
        this._stores.clear();
        this._clients.clear();
    }

    _getClients(playId: string) {
        const clients = this._clients.get(playId);
        if (!clients) {
            throw new Error(`unregistered playId "${playId}"`);
        }
        return clients;
    }

    _createStore(playId: string) {
        const store = new AMFlowStore(playId);
        store.onTick(this._findTickBroadCaster(playId));
        store.offTick(this._findTickBroadCaster(playId));
        store.onEvent(this._findEventBroadCaster(playId));
        store.offEvent(this._findEventBroadCaster(playId));
        return store;
    }

    _findTickBroadCaster(playId: string) {
        if (!this._tickBroadcaster.has(playId)) {
            this._tickBroadcaster.set(playId, (tick) =>
                this._broadcastTick(playId, tick),
            );
        }
        return this._tickBroadcaster.get(playId)!;
    }

    _findEventBroadCaster(playId: string) {
        if (!this._eventBroadcaster.has(playId)) {
            this._eventBroadcaster.set(playId, (event) =>
                this._broadcastEvent(playId, event),
            );
        }
        return this._eventBroadcaster.get(playId)!;
    }

    _broadcastTick(playId: string, tick: Tick) {
        for (const client of this._getClients(playId)) {
            client.emit(EmitEvent.Tick, tick);
        }
    }

    _broadcastEvent(playId: string, event: Event) {
        for (const client of this._getClients(playId)) {
            client.emit(EmitEvent.Event, event);
        }
    }
}
