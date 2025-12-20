import * as process from "node:process";
import { createServer } from "node:http";
import * as express from "express";
import * as cors from "cors";
import { Server } from "socket.io";
import { AMFlowServer } from "./AMFlowServer";
import { PlayManager } from "./PlayManager";
import { initializeSocket } from "./initializeSocket";

const app = express();

const allowOrigins = [process.env.CLIENT_ORIGIN].filter(
    (str) => str,
) as string[];
if (allowOrigins.length > 0) {
    app.use(
        cors({
            origin: allowOrigins,
        }),
    );
}

const http = createServer(app);
const io = new Server(
    http,
    allowOrigins.length > 0
        ? {
              cors: {
                  origin: allowOrigins,
              },
          }
        : undefined,
);
const amfServer = new AMFlowServer();
const playManager = new PlayManager({ amfServer });

const host = process.env.HOST ?? "localhost";
const port = parseInt(process.env.PORT ?? "3031");

io.on("connection", (socket) => {
    initializeSocket(socket, amfServer);
});

app.get("/start", (req, res) => {
    res.header;
    const playId = playManager.generateId();
    try {
        playManager.start(playId);
        const playToken = amfServer.generateToken(playId, true);
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
            const playToken = amfServer.generateToken(playId.toString(), false);
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
            playManager.end(playId.toString());
            res.status(200);
        } catch (err) {
            res.status(422).send(
                `failed to end. (playId = "${playId}, reason = "${(err as Error).message}")`,
            );
        }
    }
});

http.listen(port, () => {
    console.log(`start to listen port ${port}`);
});
