import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createHmac, randomUUID } from "node:crypto";

const MANAGER_PORT = Number.parseInt(process.env.MANAGER_PORT ?? "3100", 10);
const WEBAPP_SHUTDOWN_URL =
    process.env.WEBAPP_SHUTDOWN_URL ??
    "http://127.0.0.1:3000/api/internal/shutdown";
const SHUTDOWN_HMAC_SECRET = process.env.SHUTDOWN_HMAC_SECRET;

if (!SHUTDOWN_HMAC_SECRET) {
    throw new Error("SHUTDOWN_HMAC_SECRET is required");
}
const shutdownSecret = SHUTDOWN_HMAC_SECRET;

type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

type ShutdownRequest = {
    enabled?: unknown;
    reason?: unknown;
};

function json(res: ServerResponse<IncomingMessage>, status: number, body: JsonValue) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<ShutdownRequest> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalLength = 0;
        req.on("data", (chunk: Buffer) => {
            totalLength += chunk.length;
            if (totalLength > 16 * 1024) {
                reject(new Error("PayloadTooLarge"));
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            try {
                const text = Buffer.concat(chunks).toString("utf8");
                resolve(text ? (JSON.parse(text) as ShutdownRequest) : {});
            } catch {
                reject(new Error("InvalidJson"));
            }
        });
        req.on("error", reject);
    });
}

function createShutdownSignature(rawBody: string) {
    const timestamp = Date.now().toString();
    const requestId = randomUUID();
    const signature = createHmac("sha256", shutdownSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
    return { timestamp, requestId, signature };
}

async function postShutdownToWebapp(body: { enabled: boolean; reason?: string }) {
    const rawBody = JSON.stringify(body);
    const { timestamp, requestId, signature } = createShutdownSignature(rawBody);
    const response = await fetch(WEBAPP_SHUTDOWN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-shutdown-timestamp": timestamp,
            "x-shutdown-id": requestId,
            "x-shutdown-signature": signature,
        },
        body: rawBody,
    });
    const text = await response.text();
    let data: JsonValue;
    try {
        data = text ? (JSON.parse(text) as JsonValue) : {};
    } catch {
        data = { raw: text };
    }
    return {
        status: response.status,
        data,
    };
}

const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        json(res, 200, { ok: true });
        return;
    }

    if (req.method === "POST" && req.url === "/shutdown") {
        try {
            const body = await readJsonBody(req);
            if (typeof body.enabled !== "boolean") {
                json(res, 400, { ok: false, reason: "InvalidBody" });
                return;
            }
            if (body.reason != null && typeof body.reason !== "string") {
                json(res, 400, { ok: false, reason: "InvalidBody" });
                return;
            }
            const reason =
                typeof body.reason === "string" ? body.reason : undefined;
            const result = await postShutdownToWebapp({
                enabled: body.enabled,
                reason,
            });
            json(res, result.status, {
                ok: result.status < 400,
                forwarded: true,
                webapp: result.data,
            });
            return;
        } catch (err) {
            const message = err instanceof Error ? err.message : "UnknownError";
            if (message === "InvalidJson") {
                json(res, 400, { ok: false, reason: "InvalidJson" });
                return;
            }
            if (message === "PayloadTooLarge") {
                json(res, 413, { ok: false, reason: "PayloadTooLarge" });
                return;
            }
            json(res, 502, {
                ok: false,
                reason: "ForwardFailed",
                message,
            });
            return;
        }
    }

    json(res, 404, {
        ok: false,
        reason: "NotFound",
    });
});

server.listen(MANAGER_PORT, () => {
    console.log(`manager-server listening on :${MANAGER_PORT}`);
});
