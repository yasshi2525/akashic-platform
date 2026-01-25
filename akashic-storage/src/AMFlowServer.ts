import type { Socket } from "socket.io";
import type {
    GetStartPointOptions,
    GetTickListOptions,
    StartPoint,
} from "@akashic/amflow";
import type { Event } from "@akashic/playlog";
import {
    EmitEvent,
    TickPack,
    ListenSchema,
    ListenEvent,
    PlayEndReason,
    PlayExtendPayload,
} from "@yasshi2525/amflow-server-event-schema";
import { ValkeyAMFlowStore } from "./ValkeyAMFlowStore";

interface AMFlowServerParameterObject {
    playId: string;
    store: ValkeyAMFlowStore;
}

export class AMFlowServer {
    _playId: string;
    _store: ValkeyAMFlowStore;
    _clients: Set<Socket>;
    _tickSubscribers: Set<Socket>;
    _eventSubscribers: Set<Socket>;
    _broadcastTickBound: ListenSchema[typeof ListenEvent.SendTickPack];
    _broadcastEventBound: ListenSchema[typeof ListenEvent.SendEvent];

    constructor(param: AMFlowServerParameterObject) {
        this._playId = param.playId;
        this._store = param.store;
        this._tickSubscribers = new Set();
        this._eventSubscribers = new Set();
        this._clients = new Set();
        this._broadcastTickBound = this._broadcastTick.bind(this);
        this._broadcastEventBound = this._broadcastEvent.bind(this);
        this._store.onTick(this._broadcastTickBound);
        this._store.onEvent(this._broadcastEventBound);
    }

    getPlayId() {
        return this._playId;
    }

    async generateToken(isActive: boolean) {
        return await this._store.createPlayToken(
            isActive ? "active" : "passive",
        );
    }

    join(socket: Socket) {
        this._clients.add(socket);
    }

    leave(socket: Socket) {
        this.unsubscribeTick(socket);
        this.unsubscribeEvent(socket);
        this._clients.delete(socket);
    }

    async authenticate(token: string) {
        return await this._store.authenticate(token);
    }

    async sendTickPack(tickPack: TickPack) {
        await this._store.sendTickPack(tickPack);
    }

    sendEvent(event: Event) {
        this._store.sendEvent(event);
    }

    subscribeTick(socket: Socket) {
        this._tickSubscribers.add(socket);
    }

    unsubscribeTick(socket: Socket) {
        this._tickSubscribers.delete(socket);
    }

    subscribeEvent(socket: Socket) {
        this._eventSubscribers.add(socket);
    }

    unsubscribeEvent(socket: Socket) {
        this._eventSubscribers.delete(socket);
    }

    async getTickList(opts: GetTickListOptions) {
        return await this._store.getTickList(opts);
    }

    async getStartPoint(opts: GetStartPointOptions) {
        return await this._store.getStartPoint(opts);
    }

    async putStartPoint(startPoint: StartPoint) {
        await this._store.putStartPoint(startPoint);
    }

    broadcastPlayEnd(reason: PlayEndReason) {
        for (const client of this._clients) {
            client.emit(EmitEvent.PlayEnd, reason);
        }
    }

    broadcastPlayExtend(payload: PlayExtendPayload) {
        for (const client of this._clients) {
            client.emit(EmitEvent.PlayExtend, payload);
        }
    }

    getParticipants() {
        // アクティブインスタンスの接続数を除いている
        return Math.max(this._clients.size - 1, 0);
    }

    async destroy(reason: PlayEndReason) {
        this.broadcastPlayEnd(reason);
        this._store.offTick(this._broadcastTickBound);
        this._store.offEvent(this._broadcastEventBound);
        this._tickSubscribers.clear();
        this._eventSubscribers.clear();
        await Promise.all(
            [...this._clients.values()].map(async (socket) =>
                socket.disconnect(true),
            ),
        );
        await this._store.destroy();
    }

    _broadcastTick(tickPack: TickPack) {
        for (const client of this._tickSubscribers) {
            client.emit(EmitEvent.TickPack, tickPack);
        }
    }

    _broadcastEvent(event: Event) {
        for (const client of this._eventSubscribers) {
            client.emit(EmitEvent.Event, event);
        }
    }
}
