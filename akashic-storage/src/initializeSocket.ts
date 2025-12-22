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
    const assertsOpen = () => {
        if (server == null) {
            throw new Error("this session isn't opened.");
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
    socket.on(ListenEvent.Close, (cb) => {
        try {
            assertsOpen();
            server!.leave(socket);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
    socket.on(ListenEvent.Authenticate, async (token, cb) => {
        try {
            assertsOpen();
            const permission = await server!.authenticate(token);
            cb(null, permission);
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.SendTick, async (tick) => {
        try {
            assertsOpen();
            await server!.sendTick(tick);
        } catch (err) {}
    });
    socket.on(ListenEvent.SendEvent, (event) => {
        try {
            assertsOpen();
            server!.sendEvent(event);
        } catch (err) {}
    });
    socket.on(ListenEvent.SubscribeTick, () => {
        try {
            assertsOpen();
            server!.subscribeTick(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.UnsubscribeTick, () => {
        try {
            assertsOpen();
            server!.unsubscribeTick(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.SubscribeEvent, () => {
        try {
            assertsOpen();
            server!.subscribeEvent(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.UnsubscribeEvent, () => {
        try {
            assertsOpen();
            server!.unsubscribeEvent(socket);
        } catch (err) {}
    });
    socket.on(ListenEvent.GetTickList, async (opts, cb) => {
        try {
            assertsOpen();
            const tickList = await server!.getTickList(opts);
            cb(null, tickList); // NOTE: tickList が null なのは正常
        } catch (err) {
            cb((err as Error).message, undefined);
        }
    });
    socket.on(ListenEvent.GetStartPoint, async (opts, cb) => {
        try {
            assertsOpen();
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
    socket.on(ListenEvent.PutStartPoint, async (startPoint, cb) => {
        try {
            assertsOpen();
            await server!.putStartPoint(startPoint);
            cb(null);
        } catch (err) {
            cb((err as Error).message);
        }
    });
};
