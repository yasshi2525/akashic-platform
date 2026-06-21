import type { Socket } from "socket.io";
import {
    trace,
    context,
    propagation,
    SpanKind,
    SpanStatusCode,
    Span,
    Attributes,
} from "@opentelemetry/api";
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
    Carrier,
} from "@yasshi2525/amflow-server-event-schema";
import { AMFlowServerManager } from "./AMFlowServerManager";
import { AMFlowServer } from "./AMFlowServer";
import { applyBaggageAttributes } from "./tracingAttributes";

const tracer = trace.getTracer("akashic-storage.amflow");

/**
 * クライアントから伝播された trace context（carrier）を復元したうえで、
 * AMFlow イベント処理を 1 本のサーバースパンとして計測する。
 * これにより「クライアント emit → Socket.IO → ハンドラ → Valkey」までが
 * 1 トレースに連なり、どの区間で時間を要しているかを可視化できる。
 */
const withAmflowSpan = async <T>(
    name: string,
    carrier: Carrier | undefined,
    attributes: Attributes,
    fn: (span: Span) => Promise<T> | T,
): Promise<T> => {
    const ctx = propagation.extract(context.active(), carrier ?? {});
    return context.with(ctx, () =>
        tracer.startActiveSpan(
            name,
            { kind: SpanKind.SERVER, attributes },
            async (span) => {
                applyBaggageAttributes(span);
                try {
                    return await fn(span);
                } catch (err) {
                    span.recordException(err as Error);
                    span.setStatus({ code: SpanStatusCode.ERROR });
                    throw err;
                } finally {
                    span.end();
                }
            },
        ),
    );
};

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
    socket.on(ListenEvent.Authenticate, async (token, carrier, cb) => {
        await withAmflowSpan(
            "amflow.authenticate",
            carrier,
            { "amflow.event": ListenEvent.Authenticate },
            async () => {
                try {
                    assertsOpen();
                    permission = await server!.authenticate(token);
                    cb(null, permission);
                } catch (err) {
                    handleError(err, cb);
                }
            },
        );
    });
    socket.on(ListenEvent.SendTickPack, async (tickPack, carrier) => {
        await withAmflowSpan(
            "amflow.sendTickPack",
            carrier,
            { "amflow.event": ListenEvent.SendTickPack },
            async () => {
                try {
                    assertsOpen();
                    if (!permission?.writeTick) {
                        return;
                    }
                    await server!.sendTickPack(tickPack);
                } catch (err) {}
            },
        );
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
    socket.on(ListenEvent.GetTickList, async (opts, carrier, cb) => {
        await withAmflowSpan(
            "amflow.getTickList",
            carrier,
            {
                "amflow.event": ListenEvent.GetTickList,
                "amflow.tick.begin": opts.begin,
                "amflow.tick.end": opts.end,
            },
            async () => {
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
            },
        );
    });
    socket.on(ListenEvent.GetStartPoint, async (opts, carrier, cb) => {
        await withAmflowSpan(
            "amflow.getStartPoint",
            carrier,
            { "amflow.event": ListenEvent.GetStartPoint },
            async () => {
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
            },
        );
    });
    socket.on(ListenEvent.PutStartPoint, async (startPoint, carrier, cb) => {
        await withAmflowSpan(
            "amflow.putStartPoint",
            carrier,
            {
                "amflow.event": ListenEvent.PutStartPoint,
                "amflow.startPoint.frame": startPoint.frame,
            },
            async () => {
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
            },
        );
    });
    amfManager.onConnect(socket);
};
