import * as process from "node:process";
import * as express from "express";
import { RunnerManager } from "./runnerManager";

const app = express();
app.use(express.json());

const storageUrl = process.env.STORAGE_URL ?? "http://localhost:3031";
const runnerManager = new RunnerManager({ storageUrl });

app.post("/start", async (req, res) => {
    const { contentUrl, assetBaseUrl, configurationUrl, playerId, playerName } =
        req.body;
    if (
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
    const playRes = await fetch(`${storageUrl}/start`).catch((err) => {
        res.status(500);
        res.send(`failed to start. cause = "${err.message}"`);
    });
    if (!playRes) {
        res.status(500);
        res.send(
            `failed to start. cause = "empty result was responded from storage server"`,
        );
    } else {
        if (playRes.status === 200) {
            const { playId, playToken } = (await playRes.json()) as {
                playId: string;
                playToken: string;
            };
            if (!playId || !playToken) {
                res.status(500);
                res.send(
                    `failed to start. cause = "invalid data was responded from storage server"`,
                );
            } else {
                try {
                    await runnerManager.start({
                        contentUrl: contentUrl.toString(),
                        assetBaseUrl: assetBaseUrl.toString(),
                        configurationUrl: configurationUrl.toString(),
                        playId,
                        playToken,
                        playerId,
                        playerName,
                    });
                    res.json({ playId });
                } catch (err) {
                    res.status(500);
                    res.send(
                        `failed to start. cause = ${(err as Error).message}`,
                    );
                }
            }
        } else {
            const err = await playRes.text();
            res.status(500);
            res.send(`failed to start. cause = "${err}"`);
        }
    }
});

const port = parseInt(process.env.PORT ?? "3032");
app.listen(port, (err) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`start to listen port ${port}`);
    }
});
