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

        app.get("/start", (req, res) => {
            res.header;
            const playId = this._playManager.generateId();
            try {
                const server = this._playManager.start(playId);
                const playToken = server.generateToken(true);
                res.json({ playId, playToken });
            } catch (err) {
                res.status(422).send(
                    `failed to start. (playId = "${playId}, reason = "${(err as Error).message}")`,
                );
            }
        });

        app.get("/join", (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    const playToken = this._amfManager
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

        app.get("/end", (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    this._playManager.end(playId.toString());
                    res.status(200);
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
