import type { Socket } from "socket.io-client";
import type {
    AMFlow,
    GetStartPointOptions,
    GetTickListOptions,
    Permission,
    StartPoint,
} from "@akashic/amflow";
import type {
    Tick,
    Event,
    StorageKey,
    StorageValue,
    StorageReadKey,
    StorageData,
    TickList,
} from "@akashic/playlog";
import {
    EmitSchema,
    ListenSchema,
    ListenEvent,
    EmitEvent,
} from "@yasshi2525/amflow-client-event-schema";

interface AMFlowClientParameterObject {
    socket: Socket;
}

export class AMFlowClient implements AMFlow {
    _socket: Socket<ListenSchema, EmitSchema>;
    _tickHandlers: ((tick: Tick) => void)[];
    _eventHandlers: ((event: Event) => void)[];
    _onTickBound: ListenSchema[typeof ListenEvent.Tick];
    _onEventBound: ListenSchema[typeof ListenEvent.Event];

    constructor(param: AMFlowClientParameterObject) {
        this._socket = param.socket;
        this._tickHandlers = [];
        this._eventHandlers = [];
        this._onTickBound = this._onTick.bind(this);
        this._onEventBound = this._onEvent.bind(this);
    }

    open(playId: string, callback?: (error: Error | null) => void) {
        this._socket.on(ListenEvent.Tick, this._onTickBound);
        this._socket.on(ListenEvent.Event, this._onEventBound);
        this._socket.emit(EmitEvent.Open, playId, (err) => {
            if (callback) {
                callback(err);
            }
        });
    }
    close(callback?: (error: Error | null) => void) {
        this._socket.off(ListenEvent.Tick, this._onTickBound);
        this._socket.off(ListenEvent.Event, this._onEventBound);
        this._socket.emit(EmitEvent.Close, (err) => {
            if (callback) {
                callback(err);
            }
        });
    }
    authenticate(
        token: string,
        callback: (error: Error | null, permission?: Permission) => void,
    ) {
        this._socket.emit(EmitEvent.Authenticate, token, (err, permission) => {
            if (callback) {
                callback(err, permission);
            }
        });
    }
    sendTick(tick: Tick) {
        this._socket.emit(EmitEvent.SendTick, tick);
    }
    onTick(handler: (tick: Tick) => void) {
        this._tickHandlers.push(handler);
    }
    offTick(handler: (tick: Tick) => void) {
        this._tickHandlers = this._tickHandlers.filter((h) => h !== handler);
    }
    sendEvent(event: Event) {
        this._socket.emit(EmitEvent.SendEvent, event);
    }
    onEvent(handler: (event: Event) => void) {
        this._eventHandlers.push(handler);
    }
    offEvent(handler: (event: Event) => void) {
        this._eventHandlers = this._eventHandlers.filter((h) => h !== handler);
    }

    getTickList(
        optsOrBegin: number | GetTickListOptions,
        endOrCallbeck:
            | number
            | ((err: Error | null, tickList?: TickList) => void),
        callback?: (err: Error | null, tickList?: TickList) => void,
    ) {
        if (
            typeof optsOrBegin === "number" &&
            typeof endOrCallbeck === "number" &&
            callback
        ) {
            this._socket.emit(
                EmitEvent.GetTickList,
                { begin: optsOrBegin, end: endOrCallbeck },
                (err, tickList) => {
                    callback(err, tickList);
                },
            );
        } else if (
            typeof optsOrBegin !== "number" &&
            typeof endOrCallbeck !== "number"
        ) {
            this._socket.emit(
                EmitEvent.GetTickList,
                optsOrBegin,
                (err, tickList) => {
                    endOrCallbeck(err, tickList);
                },
            );
        }
    }
    putStartPoint(
        startPoint: StartPoint,
        callback: (error: Error | null) => void,
    ) {
        this._socket.emit(EmitEvent.PutStartPoint, startPoint, (err) =>
            callback(err),
        );
    }
    getStartPoint(
        opts: GetStartPointOptions,
        callback: (error: Error | null, startPoint?: StartPoint) => void,
    ) {
        this._socket.emit(EmitEvent.GetStartPoint, opts, (err, startPoint) => {
            callback(err, startPoint);
        });
    }
    putStorageData(
        key: StorageKey,
        value: StorageValue,
        options: any,
        callback: (err: Error | null) => void,
    ) {
        callback(new Error("not supported"));
    }
    getStorageData(
        keys: StorageReadKey[],
        callback: (error: Error | null, values?: StorageData[]) => void,
    ) {
        callback(new Error("not supported"));
    }

    _onTick(tick: Tick) {
        for (const handler of this._tickHandlers) {
            handler(tick);
        }
    }

    _onEvent(event: Event) {
        for (const handler of this._eventHandlers) {
            handler(event);
        }
    }
}
