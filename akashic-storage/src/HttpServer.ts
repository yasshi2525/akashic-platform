import { Server, createServer } from "node:http";
import * as express from "express";
import * as cors from "cors";
import type {
    PlayEndReason,
    PlayExtendPayload,
} from "@yasshi2525/amflow-server-event-schema";
import { AMFlowServerManager } from "./AMFlowServerManager";
import { PlayManager } from "./PlayManager";

interface HttpServerParameterObject {
    basePath: string;
    amfManager: AMFlowServerManager;
    playManager: PlayManager;
    /**
     * if undefined or empty array, skip setting cors.
     */
    allowOrigins?: string[];
    adminApiToken: string;
}

export class HttpServer {
    _basePath: string;
    _amfManager: AMFlowServerManager;
    _playManager: PlayManager;
    _publicHttp: Server;
    _adminHttp: Server;
    _adminApiToken: string;

    constructor(param: HttpServerParameterObject) {
        this._basePath = param.basePath;
        this._amfManager = param.amfManager;
        this._playManager = param.playManager;
        if (!param.adminApiToken) {
            throw new Error("STORAGE_ADMIN_TOKEN is required");
        }
        this._adminApiToken = param.adminApiToken;
        const { publicHttp, adminHttp } = this._createHttp(param.allowOrigins);
        this._publicHttp = publicHttp;
        this._adminHttp = adminHttp;
    }

    listen(publicPort: number, adminPort: number) {
        this._publicHttp.listen(publicPort, () => {
            console.log(
                `start to listen public port ${publicPort} at ${this._basePath}`,
            );
        });
        this._adminHttp.listen(adminPort, () => {
            console.log(
                `start to listen admin port ${adminPort} at ${this._basePath}`,
            );
        });
    }

    close() {
        this._publicHttp.close();
        this._adminHttp.close();
    }

    getPublicHttp() {
        return this._publicHttp;
    }

    getAdminHttp() {
        return this._adminHttp;
    }

    _createHttp(allowOrigins: string[] | undefined) {
        const publicApp = express();
        publicApp.use(express.json());
        if (allowOrigins && allowOrigins.length > 0) {
            publicApp.use(
                cors({
                    origin: allowOrigins,
                }),
            );
        }
        const publicRouter = express.Router();
        publicApp.use(this._basePath, publicRouter);

        const adminApp = express();
        adminApp.use(express.json());
        adminApp.use((req, res, next) => {
            if (
                req.header("x-akashic-internal-token") !== this._adminApiToken
            ) {
                res.status(401).send("unauthorized");
                return;
            }
            next();
        });
        const adminRouter = express.Router();
        adminApp.use(this._basePath, adminRouter);

        const publicHttp = createServer(publicApp);
        const adminHttp = createServer(adminApp);

        adminRouter.get("/start", async (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    const server = this._playManager.start(playId.toString());
                    const playToken = await server.generateToken(true);
                    res.json({ playToken });
                } catch (err) {
                    res.status(422).send(
                        `failed to start. (playId = "${playId.toString()}, reason = "${(err as Error).message}")`,
                    );
                }
            }
        });

        publicRouter.get("/join", async (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    const playToken = await this._amfManager
                        .getServer(playId.toString())
                        .generateToken(false);
                    res.json({ playToken });
                } catch (err) {
                    res.status(422).send(
                        `failed to join. (playId = "${playId}, reason = "${(err as Error).message}")`,
                    );
                }
            }
        });

        publicRouter.get("/participants", (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    const participants = this._amfManager
                        .getServer(playId.toString())
                        .getParticipants();
                    res.json({ participants });
                } catch (err) {
                    res.status(422).send(
                        `failed to get participants. (playId = "${playId}, reason = "${(err as Error).message}")`,
                    );
                }
            }
        });

        adminRouter.get("/end", async (req, res) => {
            const playId = req.query.playId;
            const reason = req.query.reason;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    await this._playManager.end(
                        playId.toString(),
                        (reason?.toString() ??
                            "INTERNAL_ERROR") as PlayEndReason,
                    );
                    res.json({ ok: true });
                } catch (err) {
                    res.status(422).send(
                        `failed to end. (playId = "${playId}, reason = "${(err as Error).message}")`,
                    );
                }
            }
        });

        publicRouter.post("/extend", (req, res) => {
            const { playId, expiresAt, remainingMs, extendMs } = req.body as {
                playId?: string;
            } & Partial<PlayExtendPayload>;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
                return;
            }
            if (expiresAt == null || remainingMs == null || extendMs == null) {
                res.status(400).send("invalid payload was specified.");
                return;
            }
            const payload: PlayExtendPayload = {
                expiresAt: expiresAt as number,
                remainingMs: remainingMs as number,
                extendMs: extendMs as number,
            };
            try {
                this._amfManager.broadcastPlayExtend(
                    playId.toString(),
                    payload,
                );
                res.json({ ok: true });
            } catch (err) {
                res.status(422).send(
                    `failed to extend. (playId = "${playId}, reason = "${(err as Error).message}")`,
                );
            }
        });

        return { publicHttp, adminHttp };
    }
}
