import type { Socket } from "socket.io";
import type { Permission } from "@akashic/amflow";
import {
    ListenSchema,
    EmitSchema,
    ListenEvent,
    AMFlowError,
    AMFlowErrorName,
    amflowErrorNames,
    AMFlowErrorNameType,
    BadRequestError,
    PermissionError,
} from "@yasshi2525/amflow-server-event-schema";
import { AMFlowServerManager } from "./AMFlowServerManager";
import { AMFlowServer } from "./AMFlowServer";

export const initializeSocket = (
    socket: Socket<ListenSchema, EmitSchema>,
    amfManager: AMFlowServerManager,
) => {
    let server: AMFlowServer | null = null;
    let permission: Permission | null = null;
    const assertsUnOpen = () => {
        if (server) {
            throw new BadRequestError("session was already opened.");
        }
    };
    const assertsOpen = () => {
        if (server == null) {
            throw new BadRequestError("session is not opened.");
        }
    };
    const handleError = (
        err: unknown,
        cb: (err: AMFlowError | null, ...data: any[]) => void,
    ) => {
        if (
            err instanceof Error &&
            amflowErrorNames.some((name) => name === err.name)
        ) {
            cb({
                name: err.name as AMFlowErrorNameType,
                message: err.message,
            });
        } else {
            cb({
                name: AMFlowErrorName.RuntimeError,
                message: "unknown error is occurred.",
            });
        }
    };
    socket.on("disconnect", () => {
        amfManager.onDisconnect(socket);
    });
    socket.on(ListenEvent.Open, (playId, cb) => {
        try {
            assertsUnOpen();
            server = amfManager.getServer(playId);
            server.join(socket);
            cb(null);
        } catch (err) {
            handleError(err, cb);
        }
    });
    socket.on(ListenEvent.Close, (cb) => {
        try {
            assertsOpen();
            server!.leave(socket);
            server = null;
            cb(null);
        } catch (err) {
            handleError(err, cb);
        }
    });
    socket.on(ListenEvent.Authenticate, async (token, cb) => {
        try {
            assertsOpen();
            permission = await server!.authenticate(token);
            cb(null, permission);
        } catch (err) {
            handleError(err, cb);
        }
    });
    socket.on(ListenEvent.SendTick, async (tick) => {
        try {
            assertsOpen();
            if (!permission?.writeTick) {
                return;
            }
            await server!.sendTick(tick);
        } catch (err) {}
    });
    socket.on(ListenEvent.SendEvent, (event) => {
        try {
            assertsOpen();
            if (!permission?.sendEvent) {
                return;
            }
            server!.sendEvent(event);
        } catch (err) {}
    });
    socket.on(ListenEvent.SubscribeTick, () => {
        try {
            assertsOpen();
            if (!permission?.subscribeTick) {
                return;
            }
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
            if (!permission?.subscribeEvent) {
                return;
            }
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
            if (!permission?.readTick) {
                throw new PermissionError();
            }
            const tickList = await server!.getTickList(opts);
            cb(null, tickList); // NOTE: tickList が null なのは正常
        } catch (err) {
            handleError(err, cb);
        }
    });
    socket.on(ListenEvent.GetStartPoint, async (opts, cb) => {
        try {
            assertsOpen();
            if (!permission?.readTick) {
                throw new PermissionError();
            }
            const startPoint = await server!.getStartPoint(opts);
            cb(null, startPoint); // NOTE: startPoint が null なのは正常
        } catch (err) {
            handleError(err, cb);
        }
    });
    socket.on(ListenEvent.PutStartPoint, async (startPoint, cb) => {
        try {
            assertsOpen();
            if (!permission?.writeTick) {
                throw new PermissionError();
            }
            await server!.putStartPoint(startPoint);
            cb(null);
        } catch (err) {
            handleError(err, cb);
        }
    });
};
