import type { Socket } from "socket.io-client";
import type {
    AMFlow,
    GetStartPointOptions,
    GetTickListOptions,
    Permission,
    StartPoint,
} from "@akashic/amflow";
import {
    Tick,
    Event,
    StorageKey,
    StorageValue,
    StorageReadKey,
    StorageData,
    TickList,
    TickIndex,
} from "@akashic/playlog";
import {
    EmitSchema,
    ListenSchema,
    ListenEvent,
    EmitEvent,
    TickPack,
    toTickList,
    toTickPack,
    PlayEndReason,
    PlayExtendPayload,
    BadRequestError,
    createAMFlowError,
    NotImplementedError,
} from "@yasshi2525/amflow-client-event-schema";

interface AMFlowClientParameterObject {
    socket: Socket;
    /**
     * sendTick する際、このサイズになるまで送信を保留します。
     * Event が含まれている場合は即時送信します。
     * @default 0
     */
    maxPreservingTickSize?: number;
}

export class AMFlowClient implements AMFlow {
    _socket: Socket<ListenSchema, EmitSchema>;
    _isOpened: boolean;
    _maxPreservingTickSize: number;
    _preservingTicks: Tick[];
    _tickHandlers: ((tick: Tick) => void)[];
    _eventHandlers: ((event: Event) => void)[];
    _playEndHandlers: ((reason: PlayEndReason) => void)[];
    _playExtendHandlers: ((payload: PlayExtendPayload) => void)[];
    _onTickPackBound: ListenSchema[typeof ListenEvent.TickPack];
    _onEventBound: ListenSchema[typeof ListenEvent.Event];
    _onPlayEndBound: ListenSchema[typeof ListenEvent.PlayEnd];
    _onPlayExtendBound: ListenSchema[typeof ListenEvent.PlayExtend];

    constructor(param: AMFlowClientParameterObject) {
        this._socket = param.socket;
        this._isOpened = false;
        this._maxPreservingTickSize = param.maxPreservingTickSize ?? 0;
        this._preservingTicks = [];
        this._tickHandlers = [];
        this._eventHandlers = [];
        this._playEndHandlers = [];
        this._playExtendHandlers = [];
        this._onTickPackBound = this._onTickPack.bind(this);
        this._onEventBound = this._onEvent.bind(this);
        this._onPlayEndBound = this._onPlayEnd.bind(this);
        this._onPlayExtendBound = this._onPlayExtend.bind(this);
    }

    open(playId: string, callback?: (error: Error | null) => void) {
        if (this._assertsUnOpen(callback)) {
            this._socket.on(ListenEvent.TickPack, this._onTickPackBound);
            this._socket.on(ListenEvent.Event, this._onEventBound);
            this._socket.on(ListenEvent.PlayEnd, this._onPlayEndBound);
            this._socket.on(ListenEvent.PlayExtend, this._onPlayExtendBound);
            this._socket.emit(EmitEvent.Open, playId, (err) => {
                this._isOpened = true;
                if (callback) {
                    if (err) {
                        callback(createAMFlowError(err));
                    } else {
                        callback(null);
                    }
                }
            });
        }
    }
    close(callback?: (error: Error | null) => void) {
        if (this._assertsOpen(callback)) {
            this._socket.off(ListenEvent.TickPack, this._onTickPackBound);
            this._socket.off(ListenEvent.Event, this._onEventBound);
            this._socket.off(ListenEvent.PlayEnd, this._onPlayEndBound);
            this._socket.off(ListenEvent.PlayExtend, this._onPlayExtendBound);
            this._socket.emit(EmitEvent.Close, (err) => {
                if (!err) {
                    this._isOpened = false;
                }
                if (callback) {
                    if (err) {
                        callback(createAMFlowError(err));
                    } else {
                        callback(null);
                    }
                }
            });
        }
    }
    authenticate(
        token: string,
        callback: (error: Error | null, permission?: Permission) => void,
    ) {
        if (this._assertsOpen(callback)) {
            this._socket.emit(
                EmitEvent.Authenticate,
                token,
                (err, permission) => {
                    if (err) {
                        callback(createAMFlowError(err));
                    } else {
                        callback(null, permission);
                    }
                },
            );
        }
    }
    sendTick(tick: Tick) {
        if (this._assertsOpen()) {
            this._handleSendingTick(tick);
        }
    }
    onTick(handler: (tick: Tick) => void) {
        if (this._assertsOpen()) {
            this._tickHandlers.push(handler);
            if (this._tickHandlers.length === 1) {
                this._socket.emit(EmitEvent.SubscribeTick);
            }
        }
    }
    offTick(handler: (tick: Tick) => void) {
        if (this._assertsOpen()) {
            this._tickHandlers = this._tickHandlers.filter(
                (h) => h !== handler,
            );
            if (this._tickHandlers.length === 0) {
                this._socket.emit(EmitEvent.UnsubscribeTick);
            }
        }
    }
    sendEvent(event: Event) {
        if (this._assertsOpen()) {
            this._socket.emit(EmitEvent.SendEvent, event);
        }
    }
    onEvent(handler: (event: Event) => void) {
        if (this._assertsOpen()) {
            this._eventHandlers.push(handler);
            if (this._eventHandlers.length === 1) {
                this._socket.emit(EmitEvent.SubscribeEvent);
            }
        }
    }
    offEvent(handler: (event: Event) => void) {
        if (this._assertsOpen()) {
            this._eventHandlers = this._eventHandlers.filter(
                (h) => h !== handler,
            );
            if (this._eventHandlers.length === 0) {
                this._socket.emit(EmitEvent.UnsubscribeEvent);
            }
        }
    }
    /**
     * 独自の実装。プレイが外部要因で終了した際の通知を受ける
     */
    onPlayEnd(handler: (reason: PlayEndReason) => void) {
        this._playEndHandlers.push(handler);
    }
    offPlayEnd(handler: (reason: PlayEndReason) => void) {
        this._playEndHandlers = this._playEndHandlers.filter(
            (h) => h !== handler,
        );
    }
    /**
     * 独自の実装。プレイが延長された際の通知を受ける
     */
    onPlayExtend(handler: (payload: PlayExtendPayload) => void) {
        this._playExtendHandlers.push(handler);
    }
    offPlayExtend(handler: (payload: PlayExtendPayload) => void) {
        this._playExtendHandlers = this._playExtendHandlers.filter(
            (h) => h !== handler,
        );
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
            if (this._assertsOpen(callback)) {
                this._socket.emit(
                    EmitEvent.GetTickList,
                    { begin: optsOrBegin, end: endOrCallbeck },
                    (err, tickList) => {
                        if (err) {
                            callback(createAMFlowError(err));
                        } else {
                            callback(null, tickList ?? undefined);
                        }
                    },
                );
            }
        } else if (
            typeof optsOrBegin !== "number" &&
            typeof endOrCallbeck !== "number"
        ) {
            if (this._assertsOpen(endOrCallbeck)) {
                this._socket.emit(
                    EmitEvent.GetTickList,
                    optsOrBegin,
                    (err, tickList) => {
                        if (err) {
                            endOrCallbeck(createAMFlowError(err));
                        } else {
                            endOrCallbeck(null, tickList ?? undefined);
                        }
                    },
                );
            }
        }
    }
    putStartPoint(
        startPoint: StartPoint,
        callback: (error: Error | null) => void,
    ) {
        if (this._assertsOpen(callback)) {
            this._socket.emit(EmitEvent.PutStartPoint, startPoint, (err) => {
                if (err) {
                    callback(createAMFlowError(err));
                } else {
                    callback(null);
                }
            });
        }
    }
    getStartPoint(
        opts: GetStartPointOptions,
        callback: (error: Error | null, startPoint?: StartPoint) => void,
    ) {
        if (this._assertsOpen(callback)) {
            this._socket.emit(
                EmitEvent.GetStartPoint,
                opts,
                (err, startPoint) => {
                    if (err) {
                        callback(createAMFlowError(err));
                    } else {
                        callback(null, startPoint ?? undefined);
                    }
                },
            );
        }
    }
    putStorageData(
        key: StorageKey,
        value: StorageValue,
        options: any,
        callback: (err: Error | null) => void,
    ) {
        callback(new NotImplementedError("not supported"));
    }
    getStorageData(
        keys: StorageReadKey[],
        callback: (error: Error | null, values?: StorageData[]) => void,
    ) {
        callback(new NotImplementedError("not supported"));
    }

    _onTickPack(tickPack: TickPack) {
        for (const tick of toTickList(tickPack)) {
            for (const handler of this._tickHandlers) {
                handler(tick);
            }
        }
    }

    _onEvent(event: Event) {
        for (const handler of this._eventHandlers) {
            handler(event);
        }
    }

    _onPlayEnd(reason: PlayEndReason) {
        for (const handler of this._playEndHandlers) {
            handler(reason);
        }
    }

    _onPlayExtend(payload: PlayExtendPayload) {
        for (const handler of this._playExtendHandlers) {
            handler(payload);
        }
    }

    _assertsUnOpen(cb?: (err: Error | null, ...data: any[]) => void) {
        if (this._isOpened) {
            if (cb) {
                cb(new BadRequestError("session is already opened."));
            }
            return false;
        }
        return true;
    }

    _assertsOpen(cb?: (err: Error | null, ...data: any[]) => void) {
        if (!this._isOpened) {
            if (cb) {
                cb(new BadRequestError("session isn't opened."));
            }
            return false;
        }
        return true;
    }

    _handleSendingTick(tick: Tick) {
        this._preservingTicks.push(tick);
        if (
            tick[TickIndex.Events] ||
            this._preservingTicks.length >= this._maxPreservingTickSize
        ) {
            for (const pack of toTickPack(this._preservingTicks)) {
                this._socket.emit(EmitEvent.SendTickPack, pack);
            }
            this._preservingTicks = [];
        }
    }
}
