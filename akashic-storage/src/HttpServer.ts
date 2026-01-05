import { Server, createServer } from "node:http";
import * as express from "express";
import * as cors from "cors";
import { AMFlowServerManager } from "./AMFlowServerManager";
import { PlayManager } from "./PlayManager";

interface HttpServerParameterObject {
    amfManager: AMFlowServerManager;
    playManager: PlayManager;
    /**
     * if undefined or empty array, skip setting cors.
     */
    allowOrigins?: string[];
}

export class HttpServer {
    _amfManager: AMFlowServerManager;
    _playManager: PlayManager;
    _http: Server;

    constructor(param: HttpServerParameterObject) {
        this._amfManager = param.amfManager;
        this._playManager = param.playManager;
        this._http = this._createHttp(param.allowOrigins);
    }

    /**
     * @param port default 3031
     */
    listen(port: number = 3031) {
        this._http.listen(port, () => {
            console.log(`start to listen port ${port}`);
        });
    }

    close() {
        this._http.close();
    }

    getHttp() {
        return this._http;
    }

    _createHttp(allowOrigins: string[] | undefined) {
        const app = express();
        if (allowOrigins && allowOrigins.length > 0) {
            app.use(
                cors({
                    origin: allowOrigins,
                }),
            );
        }

        const http = createServer(app);

        app.get("/start", async (req, res) => {
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

        app.get("/join", async (req, res) => {
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

        app.get("/participants", (req, res) => {
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

        app.get("/end", async (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    await this._playManager.end(playId.toString());
                    res.json({ ok: true });
                } catch (err) {
                    res.status(422).send(
                        `failed to end. (playId = "${playId}, reason = "${(err as Error).message}")`,
                    );
                }
            }
        });

        return http;
    }
}
