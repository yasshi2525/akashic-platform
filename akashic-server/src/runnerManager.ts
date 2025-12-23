import type { AMFlow } from "@akashic/amflow";
import { RunnerV3 } from "@akashic/headless-driver";
import { Session } from "@yasshi2525/playlog-client-like";

/**
 * `akashic-gameview` の ProtocolType と同じ。
 * NOTE: `akashic-gameview` 自体を元プロジェクトと同様に独立させてもよいが、
 * これしか使用してないためコピペですませた。
 */
const ProtocolType = {
    WebSocket: 0,
} as const;

interface RunnerManagerParameterObject {
    storageUrl: string;
}

interface RunnerStartParameterObject {
    contentUrl: string;
    assetBaseUrl: string;
    configurationUrl: string;
    playId: string;
    playToken: string;
    playerId: string;
    playerName: string;
}

export class RunnerManager {
    _storageUrl: string;
    _runners: Map<string, RunnerV3>;
    _nextRunnerId: number;

    constructor(param: RunnerManagerParameterObject) {
        this._storageUrl = param.storageUrl;
        this._runners = new Map();
        this._nextRunnerId = 1;
    }

    async start(param: RunnerStartParameterObject) {
        if (this._runners.has(param.playId)) {
            throw new Error(
                `runner on playId = "${param.playId}" already exists.`,
            );
        }
        const session = Session(this._storageUrl, {
            socketType: ProtocolType.WebSocket,
            validationData: { playId: param.playId, token: param.playToken },
        });
        session.on("error", (err) => {
            console.error("error on session", err);
        });
        const amflow = await new Promise<AMFlow>((resolve, reject) => {
            session.open((err) => {
                if (err) {
                    reject(err);
                } else {
                    session.createClient(
                        {
                            usePrimaryChannel: true,
                            maxPreservingTickSize: 5,
                        },
                        (err, client) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(client!);
                            }
                        },
                    );
                }
            });
        }).catch((err) => {
            throw err;
        });
        const runner = new RunnerV3({
            contentUrl: param.contentUrl,
            assetBaseUrl: param.assetBaseUrl,
            configurationUrl: param.configurationUrl,
            playId: param.playId,
            playToken: param.playToken,
            runnerId: `runner${this._nextRunnerId}`,
            amflow,
            executionMode: "active",
            trusted: true,
            external: {},
            externalValue: {},
            loadFileHandler: (url, encoding, cb) => {
                if (
                    !url.startsWith(param.assetBaseUrl) &&
                    !url.startsWith(param.configurationUrl)
                ) {
                    cb(new Error(`unallowed url ${url}`));
                    return;
                }
                fetch(url)
                    .then((res) =>
                        res
                            .text()
                            .then((data) => {
                                cb(null, data);
                            })
                            .catch((err) => {
                                cb(err);
                            }),
                    )
                    .catch((err) => {
                        cb(err);
                    });
            },
        });
        runner.errorTrigger.add((err) => {
            console.error(`error on runner ${runner.runnerId}`, err);
            runner.stop();
        });
        const game = await runner.start({ paused: false });
        if (!game) {
            throw new Error(
                `failed to start runner (runnerId = ${runner.runnerId}, playId = ${runner.playId})`,
            );
        }
        amflow.sendEvent([0x0, 0, param.playerId, param.playerName]);
        this._nextRunnerId++;
    }

    join(playerId: string, playerName: string) {}

    end(playId: string) {}
}
