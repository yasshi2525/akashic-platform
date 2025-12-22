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
    _playId: string | null;
    _tickHandlers: ((tick: Tick) => void)[];
    _eventHandlers: ((event: Event) => void)[];
    _onTickBound: ListenSchema[typeof ListenEvent.Tick];
    _onEventBound: ListenSchema[typeof ListenEvent.Event];

    constructor(param: AMFlowClientParameterObject) {
        this._socket = param.socket;
        this._playId = null;
        this._tickHandlers = [];
        this._eventHandlers = [];
        this._onTickBound = this._onTick.bind(this);
        this._onEventBound = this._onEvent.bind(this);
    }

    open(playId: string, callback?: (error: Error | null) => void) {
        this._socket.on(ListenEvent.Tick, this._onTickBound);
        this._socket.on(ListenEvent.Event, this._onEventBound);
        this._socket.emit(EmitEvent.Open, playId, (err) => {
            this._playId = playId;
            if (callback) {
                if (err) {
                    callback(new Error(err));
                } else {
                    callback(null);
                }
            }
        });
    }
    close(callback?: (error: Error | null) => void) {
        if (!this._playId) {
            if (callback) {
                callback(new Error("no player id was hold"));
            }
            return;
        }
        this._socket.off(ListenEvent.Tick, this._onTickBound);
        this._socket.off(ListenEvent.Event, this._onEventBound);
        this._socket.emit(EmitEvent.Close, this._playId, (err) => {
            if (!err) {
                this._playId = null;
            }
            if (callback) {
                if (err) {
                    callback(new Error(err));
                } else {
                    callback(null);
                }
            }
        });
    }
    authenticate(
        token: string,
        callback: (error: Error | null, permission?: Permission) => void,
    ) {
        if (!this._playId) {
            callback(new Error("no player id was hold"));
            return;
        }
        this._socket.emit(
            EmitEvent.Authenticate,
            this._playId,
            token,
            (err, permission) => {
                if (err) {
                    callback(new Error(err));
                } else {
                    callback(null, permission);
                }
            },
        );
    }
    sendTick(tick: Tick) {
        if (!this._playId) {
            return;
        }
        this._socket.emit(EmitEvent.SendTick, this._playId, tick);
    }
    onTick(handler: (tick: Tick) => void) {
        if (!this._playId) {
            return;
        }
        this._tickHandlers.push(handler);
        if (this._tickHandlers.length === 1) {
            this._socket.emit(EmitEvent.SubscribeTick, this._playId);
        }
    }
    offTick(handler: (tick: Tick) => void) {
        if (!this._playId) {
            return;
        }
        this._tickHandlers = this._tickHandlers.filter((h) => h !== handler);
        if (this._tickHandlers.length === 0) {
            this._socket.emit(EmitEvent.UnsubscribeTick, this._playId);
        }
    }
    sendEvent(event: Event) {
        if (!this._playId) {
            return;
        }
        this._socket.emit(EmitEvent.SendEvent, this._playId, event);
    }
    onEvent(handler: (event: Event) => void) {
        if (!this._playId) {
            return;
        }
        this._eventHandlers.push(handler);
        if (this._eventHandlers.length === 1) {
            this._socket.emit(EmitEvent.SubscribeEvent, this._playId);
        }
    }
    offEvent(handler: (event: Event) => void) {
        if (!this._playId) {
            return;
        }
        this._eventHandlers = this._eventHandlers.filter((h) => h !== handler);
        if (this._eventHandlers.length === 0) {
            this._socket.emit(EmitEvent.UnsubscribeEvent, this._playId);
        }
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
            if (!this._playId) {
                callback(new Error("no player id was hold"));
                return;
            }
            this._socket.emit(
                EmitEvent.GetTickList,
                this._playId,
                { begin: optsOrBegin, end: endOrCallbeck },
                (err, tickList) => {
                    if (err) {
                        callback(new Error(err));
                    } else {
                        callback(null, tickList ?? undefined);
                    }
                },
            );
        } else if (
            typeof optsOrBegin !== "number" &&
            typeof endOrCallbeck !== "number"
        ) {
            if (!this._playId) {
                endOrCallbeck(new Error("no player id was hold"));
                return;
            }
            this._socket.emit(
                EmitEvent.GetTickList,
                this._playId,
                optsOrBegin,
                (err, tickList) => {
                    if (err) {
                        endOrCallbeck(new Error(err));
                    } else {
                        endOrCallbeck(null, tickList ?? undefined);
                    }
                },
            );
        }
    }
    putStartPoint(
        startPoint: StartPoint,
        callback: (error: Error | null) => void,
    ) {
        if (!this._playId) {
            callback(new Error("no player id was hold"));
            return;
        }
        this._socket.emit(
            EmitEvent.PutStartPoint,
            this._playId,
            startPoint,
            (err) => {
                if (err) {
                    callback(new Error(err));
                } else {
                    callback(null);
                }
            },
        );
    }
    getStartPoint(
        opts: GetStartPointOptions,
        callback: (error: Error | null, startPoint?: StartPoint) => void,
    ) {
        if (!this._playId) {
            callback(new Error("no player id was hold"));
            return;
        }
        this._socket.emit(
            EmitEvent.GetStartPoint,
            this._playId,
            opts,
            (err, startPoint) => {
                if (err) {
                    callback(new Error(err));
                } else {
                    callback(null, startPoint);
                }
            },
        );
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
