import type { Socket } from "socket.io";
import {
    ListenSchema,
    EmitSchema,
    ListenEvent,
} from "@yasshi2525/amflow-server-event-schema";
import { AMFlowServerManager } from "./AMFlowServerManager";
import { AMFlowServer } from "./AMFlowServer";

export const initializeSocket = (
    socket: Socket<ListenSchema, EmitSchema>,
    amfManager: AMFlowServerManager,
) => {
    let server: AMFlowServer | null = null;
    const throwsIfInvalidPlayId = (playId: string) => {
        if (server == null) {
            throw new Error("this session isn't opened.");
        }
        if (server.getPlayId() !== playId) {
            throw new Error("invalid playId was specified.");
        }
    };
    socket.on("disconnect", () => {
        amfManager.onDisconnect(socket);
    });
    socket.on(ListenEvent.Open, (playId, cb) => {
        try {
            if (server) {
                throw new Error("this session was already opened");
            }
            server = amfManager.getServer(playId);
            server.join(socket);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
    socket.on(ListenEvent.Close, (playId, cb) => {
        try {
            throwsIfInvalidPlayId(playId);
            server!.leave(socket);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
    socket.on(ListenEvent.Authenticate, async (playId, token, cb) => {
        try {
            throwsIfInvalidPlayId(playId);
            const permission = await server!.authenticate(token);
            cb(null, permission);
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.SendTick, async (playId, tick) => {
        try {
            throwsIfInvalidPlayId(playId);
            await server!.sendTick(tick);
        } catch (err) {}
    });
    socket.on(ListenEvent.SendEvent, (playId, event) => {
        try {
            throwsIfInvalidPlayId(playId);
            server!.sendEvent(event);
        } catch (err) {}
    });
    socket.on(ListenEvent.SubscribeTick, (playId) => {
        try {
            throwsIfInvalidPlayId(playId);
            server!.subscribeTick(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.UnsubscribeTick, (playId) => {
        try {
            throwsIfInvalidPlayId(playId);
            server!.unsubscribeTick(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.SubscribeEvent, (playId) => {
        try {
            throwsIfInvalidPlayId(playId);
            server!.subscribeEvent(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.UnsubscribeEvent, (playId) => {
        try {
            throwsIfInvalidPlayId(playId);
            server!.unsubscribeEvent(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.GetTickList, async (playId, opts, cb) => {
        try {
            throwsIfInvalidPlayId(playId);
            const tickList = await server!.getTickList(opts);
            cb(null, tickList); // NOTE: tickList が null なのは正常
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.GetStartPoint, async (playId, opts, cb) => {
        try {
            throwsIfInvalidPlayId(playId);
            const startPoint = await server!.getStartPoint(opts);
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
            throwsIfInvalidPlayId(playId);
            await server!.putStartPoint(startPoint);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
};
