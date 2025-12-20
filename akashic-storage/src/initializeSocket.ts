import type { Socket } from "socket.io";
import {
    ListenSchema,
    EmitSchema,
    ListenEvent,
} from "@yasshi2525/amflow-server-event-schema";
import { AMFlowServer } from "./AMFlowServer";

export const initializeSocket = (
    socket: Socket<ListenSchema, EmitSchema>,
    server: AMFlowServer,
) => {
    socket.on("disconnect", () => {});
    socket.on(ListenEvent.Open, (playId, cb) => {
        try {
            server.join(playId, socket);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
    socket.on(ListenEvent.Close, (playId, cb) => {
        try {
            server.leave(playId, socket);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
    socket.on(ListenEvent.Authenticate, (playId, token, cb) => {
        try {
            const permission = server.getStore(playId).authenticate(token);
            cb(null, permission);
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.SendTick, (playId, tick) => {
        try {
            server.getStore(playId).sendTick(tick);
        } catch (err) {}
    });
    socket.on(ListenEvent.SendEvent, (playId, event) => {
        try {
            server.getStore(playId).sendEvent(event);
        } catch (err) {}
    });
    socket.on(ListenEvent.GetTickList, (playId, opts, cb) => {
        try {
            const tickList = server.getStore(playId).getTickList(opts);
            if (tickList) {
                cb(null, tickList);
            } else {
                cb("failed to get tick list", undefined);
            }
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.GetStartPoint, (playId, opts, cb) => {
        try {
            const startPoint = server.getStore(playId).getStartPoint(opts);
            if (startPoint) {
                cb(null, startPoint);
            } else {
                cb("failed to get start point", undefined);
            }
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.PutStartPoint, (playId, startPoint, cb) => {
        try {
            server.getStore(playId).putStartPoint(startPoint);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
};
