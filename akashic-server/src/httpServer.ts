import { Server } from "node:http";
import * as express from "express";
import { Express } from "express";
import { RunnerManager } from "./runnerManager";

interface HttpServerParameterObject {
    manager: RunnerManager;
}

export class HttpServer {
    _manager: RunnerManager;
    _app: Express;
    _server?: Server;

    constructor(param: HttpServerParameterObject) {
        this._manager = param.manager;
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
        app.use(express.json());

        app.post("/start", async (req, res) => {
            const {
                contentId,
                contentUrl,
                assetBaseUrl,
                configurationUrl,
                playerId,
                playerUserId,
                playerName,
            } = req.body;
            if (
                contentId == null ||
                !contentUrl?.toString() ||
                !assetBaseUrl?.toString() ||
                !configurationUrl?.toString() ||
                !playerId?.toString() ||
                !playerName?.toString()
            ) {
                res.status(400);
                res.send("unsufficient parameter was specified.");
                return;
            }
            try {
                const playId = await this._manager.start({
                    contentId,
                    contentUrl: contentUrl.toString(),
                    assetBaseUrl: assetBaseUrl.toString(),
                    configurationUrl: configurationUrl.toString(),
                    playerId: playerId.toString(),
                    playerUserId: playerUserId?.toString(),
                    playerName: playerName.toString(),
                });
                res.json({ playId });
            } catch (err) {
                res.status(500);
                res.send(`failed to start. cause = ${(err as Error).message}`);
            }
        });

        app.get("/end", async (req, res) => {
            const playId = req.query.playId;
            if (!playId?.toString()) {
                res.status(400).send("no playId was specified.");
            } else {
                try {
                    await this._manager.end(parseInt(playId.toString()));
                    res.json({ ok: true });
                } catch (err) {
                    res.status(500);
                    res.send(
                        `failed to end. cause = ${(err as Error).message}`,
                    );
                }
            }
        });

        return app;
    }
}
