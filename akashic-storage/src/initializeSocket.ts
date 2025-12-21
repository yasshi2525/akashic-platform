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
    socket.on(ListenEvent.Authenticate, async (playId, token, cb) => {
        try {
            const permission = await server
                .getStore(playId)
                .authenticate(token);
            cb(null, permission);
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.SendTick, async (playId, tick) => {
        try {
            await server.getStore(playId).sendTick(tick);
        } catch (err) {}
    });
    socket.on(ListenEvent.SendEvent, (playId, event) => {
        try {
            server.getStore(playId).sendEvent(event);
        } catch (err) {}
    });
    socket.on(ListenEvent.GetTickList, async (playId, opts, cb) => {
        try {
            const tickList = await server.getStore(playId).getTickList(opts);
            cb(null, tickList); // NOTE: tickList が null なのは正常
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.GetStartPoint, async (playId, opts, cb) => {
        try {
            const startPoint = await server
                .getStore(playId)
                .getStartPoint(opts);
            if (startPoint) {
                cb(null, startPoint);
            } else {
                cb("failed to get start point", undefined);
            }
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.PutStartPoint, async (playId, startPoint, cb) => {
        try {
            await server.getStore(playId).putStartPoint(startPoint);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
};
