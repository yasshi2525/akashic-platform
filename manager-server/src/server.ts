import { Server } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import * as express from "express";
import { Express, NextFunction, Request, Response } from "express";

const WEBAPP_URL = process.env.WEBAPP_URL ?? "http://localhost:3000";
const hmacSecret = process.env.HMAC_SECRET;

if (!hmacSecret) {
    throw new Error("HMAC_SECRET is required");
}

type DrainRequest = {
    enabled?: boolean;
    reason?: string;
};

function createDrainSignature(rawBody: string) {
    const timestamp = Date.now().toString();
    const requestId = randomUUID();
    const signature = createHmac("sha256", hmacSecret!)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
    return { timestamp, requestId, signature };
}

async function postDrainToWebapp(body: { enabled: boolean; reason?: string }) {
    const rawBody = JSON.stringify(body);
    const { timestamp, requestId, signature } = createDrainSignature(rawBody);
    const response = await fetch(`${WEBAPP_URL}/api/internal/drain`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-drain-timestamp": timestamp,
            "x-drain-id": requestId,
            "x-drain-signature": signature,
        },
        body: rawBody,
    });
    const text = await response.text();
    try {
        return {
            status: response.status,
            data: JSON.parse(text),
        };
    } catch (err) {
        console.warn(`failed to parse response`, text, err);
        return {
            status: response.status,
            data: { raw: text },
        };
    }
}

export class HttpServer {
    _app: Express;
    _server?: Server;

    constructor() {
        this._app = this._createHttp();
    }

    listen(port: number) {
        this._server = this._app.listen(port, (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`start to listen port ${port}`);
            }
        });
    }

    close() {
        if (this._server) {
            this._server.close();
        }
    }

    _createHttp() {
        const app = express();
        app.use(
            express.json({
                limit: "16kb",
            }),
        );

        app.get("/health", (_req: Request, res: Response) => {
            res.set("Cache-Control", "no-store");
            res.json({ ok: true });
        });

        app.get("/drain", async (req: Request, res: Response) => {
            const reason = req.query.reason?.toString();
            try {
                const result = await postDrainToWebapp({
                    enabled: true,
                    reason,
                });
                res.status(result.status).json({
                    ok: result.status === 200,
                    forwarded: true,
                    webapp: result.data,
                });
                return;
            } catch (err) {
                res.status(502).json({
                    ok: false,
                    reason: "ForwardFailed",
                    message: (err as Error).message,
                });
                return;
            }
        });

        app.use((req: Request, res: Response) => {
            res.status(404).json({
                ok: false,
                reason: "NotFound",
            });
        });

        app.use(
            (
                err: Error & { type?: string; status?: number },
                _req: Request,
                res: Response,
                _next: NextFunction,
            ) => {
                if (err.type === "entity.too.large" || err.status === 413) {
                    res.status(413).json({
                        ok: false,
                        reason: "PayloadTooLarge",
                    });
                    return;
                }
                res.status(400).json({
                    ok: false,
                    reason: "InvalidJson",
                });
            },
        );

        return app;
    }
}
