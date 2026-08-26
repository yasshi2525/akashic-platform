import { Server } from "node:http";
import express from "express";
import { Express, Router } from "express";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import type {
    AssetRequest,
    PlayEndedRequest,
} from "@yasshi2525/runner-ipc-schema";
import { RunnerManager } from "./runnerManager";

// akashic-runner がバッファしうる量 (4MiB) に余裕をみた上限。
const LOG_BATCH_LIMIT = "8mb";

interface HttpServerParameterObject {
    manager: RunnerManager;
    webappApiToken: string;
    serverRunnerApiToken: string;
}

export class HttpServer {
    _manager: RunnerManager;
    _app: Express;
    _server?: Server;
    _webappApiToken: string;
    _serverRunnerApiToken: string;

    constructor(param: HttpServerParameterObject) {
        this._manager = param.manager;
        if (!param.webappApiToken) {
            throw new Error("SERVER_WEBAPP_API_TOKEN is required");
        }
        if (!param.serverRunnerApiToken) {
            throw new Error("SERVER_RUNNER_API_TOKEN is required");
        }
        this._webappApiToken = param.webappApiToken;
        this._serverRunnerApiToken = param.serverRunnerApiToken;
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

    _authWith(token: string) {
        return (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction,
        ) => {
            if (req.header("x-akashic-internal-token") !== token) {
                res.status(401).json({ ok: false, reason: "Unauthorized" });
                return;
            }
            next();
        };
    }

    _createHttp() {
        const app = express();

        app.post(
            "/internal/logs",
            this._authWith(this._serverRunnerApiToken),
            express.text({ type: "*/*", limit: LOG_BATCH_LIMIT }),
            (req, res) => {
                const playId = parseInt(String(req.query.playId));
                if (Number.isNaN(playId)) {
                    res.status(400).json({ ok: false, reason: "BadRequest" });
                    return;
                }
                const runner = this._manager.get(playId);
                if (!runner || !runner.acceptsLog()) {
                    res.status(404).json({ ok: false, reason: "NotFound" });
                    return;
                }
                const seq = Number.parseInt(String(req.query.seq), 10);
                const body = typeof req.body === "string" ? req.body : "";
                // 行単位で送出されるため、シークレットがバッチ境界で分断されることはない。
                if (body) {
                    runner.appendLog(body, Number.isNaN(seq) ? undefined : seq);
                }
                if (req.query.final === "1") {
                    runner.markLogDrained();
                }
                res.json({ ok: true });
            },
        );

        app.use(express.json());

        app.use("/internal", this._authWith(this._serverRunnerApiToken));
        app.use("/internal", this._createInternalRouter());

        app.use(this._authWith(this._webappApiToken));
        this._registerControlRoutes(app);

        return app;
    }

    _createInternalRouter() {
        const router = Router();

        router.post("/asset", async (req, res) => {
            const { playId, url } = req.body as Partial<AssetRequest>;
            if (playId == null || !url) {
                res.status(400).json({ ok: false, reason: "BadRequest" });
                return;
            }
            const runner = this._manager.get(playId);
            const safeUrl = runner?.resolveAllowedAsset(url);
            if (!runner || !safeUrl) {
                res.status(403).json({ ok: false, reason: "Forbidden" });
                return;
            }
            try {
                const upstream = await fetch(safeUrl, { redirect: "error" });
                if (!upstream.ok) {
                    res.status(502).json({ ok: false, reason: "BadGateway" });
                    return;
                }
                const body = Buffer.from(await upstream.arrayBuffer());
                res.setHeader(
                    "content-type",
                    upstream.headers.get("content-type") ??
                        "application/octet-stream",
                );
                res.send(body);
            } catch (err) {
                res.status(502).json({
                    ok: false,
                    reason: "BadGateway",
                    message: (err as Error).message,
                });
            }
        });

        router.post("/play-ended", async (req, res) => {
            const { playId, reason, origin } =
                req.body as Partial<PlayEndedRequest>;
            if (playId == null || !reason || !origin) {
                res.status(400).json({ ok: false, reason: "BadRequest" });
                return;
            }
            // storage 発の終了は storage 側で処理済みなので再通知しない。
            const notifyStorage = origin !== "storage";
            res.json({ ok: true });
            this._manager
                .end(playId, reason as PlayEndReason, notifyStorage)
                .catch((err) => {
                    console.warn(
                        "failed to handle play-ended",
                        { playId },
                        err,
                    );
                });
        });

        return router;
    }

    _registerControlRoutes(app: Express) {
        app.post("/start", async (req, res) => {
            const {
                playName,
                contentId,
                contentUrl,
                assetBaseUrl,
                configurationUrl,
                playerId,
                playerUserId,
                playerName,
                joinWord,
                inviteHash,
                requireSignIn,
                chatEnabled,
            } = req.body;
            if (
                !playName?.toString() ||
                contentId == null ||
                !contentUrl?.toString() ||
                !assetBaseUrl?.toString() ||
                !configurationUrl?.toString() ||
                !playerId?.toString() ||
                !playerName?.toString()
            ) {
                res.status(400).json({ ok: false, reason: "BadRequest" });
                return;
            }
            try {
                const playId = await this._manager.start({
                    playName: playName.toString(),
                    contentId,
                    contentUrl: contentUrl.toString(),
                    assetBaseUrl: assetBaseUrl.toString(),
                    configurationUrl: configurationUrl.toString(),
                    playerId: playerId.toString(),
                    playerUserId: playerUserId?.toString(),
                    playerName: playerName.toString(),
                    isLimited: !!(
                        inviteHash?.toString() && joinWord?.toString()
                    ),
                    joinWord: joinWord?.toString(),
                    inviteHash: inviteHash?.toString(),
                    requireSignIn: !!requireSignIn,
                    chatEnabled: !!chatEnabled,
                    onDestroy: (playId) => this._manager.unregister(playId),
                });
                res.json({ playId });
            } catch (err) {
                res.status(500).json({
                    ok: false,
                    reason: "InternalError",
                    message: (err as Error).message,
                });
            }
        });

        app.get("/end", async (req, res) => {
            const playId = req.query.playId;
            const reason = req.query.reason;
            if (!playId?.toString()) {
                res.status(400).json({ ok: false, reason: "MissingPlayId" });
            } else {
                try {
                    await this._manager.end(
                        parseInt(playId.toString()),
                        (reason?.toString() ??
                            "INTERNAL_ERROR") as PlayEndReason,
                    );
                    res.json({ ok: true });
                } catch (err) {
                    res.status(500).json({
                        ok: false,
                        reason: "InternalError",
                        message: (err as Error).message,
                    });
                }
            }
        });

        app.get("/remaining", (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).json({ ok: false, reason: "MissingPlayId" });
                return;
            }
            const remaining = this._manager.getRemaining(
                parseInt(playId.toString()),
            );
            if (!remaining) {
                res.status(404).json({ ok: false, reason: "NotFound" });
                return;
            }
            res.json({
                ok: true,
                ...remaining,
            });
        });

        app.post("/extend", async (req, res) => {
            const { playId } = req.body as { playId?: string };
            if (!playId?.toString()) {
                res.status(400).json({ ok: false, reason: "MissingPlayId" });
                return;
            }
            try {
                const result = await this._manager.extend(
                    parseInt(playId.toString()),
                );
                if (!result.ok && result.reason === "NotFound") {
                    res.status(404).json({ ok: false, reason: "NotFound" });
                    return;
                }
                if (!result.ok && result.reason === "TooEarly") {
                    res.status(409).json(result);
                    return;
                }
                res.json(result);
            } catch (err) {
                res.status(500).json({
                    ok: false,
                    reason: "InternalError",
                    message: (err as Error).message,
                });
            }
        });
    }
}
