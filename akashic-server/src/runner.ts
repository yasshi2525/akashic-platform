import type { AMFlow } from "@akashic/amflow";
import { RunnerV3 } from "@akashic/headless-driver";
import { prisma } from "@yasshi2525/persist-schema";
import { Session, SessionLike } from "@yasshi2525/playlog-client-like";

/**
 * `akashic-gameview` の ProtocolType と同じ。
 * NOTE: `akashic-gameview` 自体を元プロジェクトと同様に独立させてもよいが、
 * これしか使用してないためコピペですませた。
 */
const ProtocolType = {
    WebSocket: 0,
} as const;

export interface RunnerParameterObject {
    storageUrl: string;
    contentId: number;
    contentUrl: string;
    assetBaseUrl: string;
    configurationUrl: string;
    playerId: string;
    playerUserId?: string;
    playerName: string;
}

export class Runner {
    _param: RunnerParameterObject;
    _runner?: RunnerV3;
    _session?: SessionLike;

    constructor(param: RunnerParameterObject) {
        this._param = param;
    }

    async start() {
        if (this._runner || this._session) {
            throw new Error(
                `runner (runnerId = "${this._runner?.runnerId}", playId = "${this._runner?.playId}") has already started.`,
            );
        }
        const playId = await this._createPlayId();
        try {
            const playToken = await this._fetchPlayToken(playId);
            this._session = this._openSession(playId, playToken);
            const amflow = await this._createAMFlow(this._session);
            this._runner = await this._createRunner(playId, playToken, amflow);
            this._initGame(amflow, playId);
            return playId;
        } catch (err) {
            this._deletePlayId(playId);
            throw err;
        }
    }

    async end() {
        if (this._runner) {
            const playId = parseInt(this._runner.playId);
            this._runner.stop();
            this._endPlay(playId);
            this._deletePlayId(playId);
        }
        if (this._session) {
            this._closeSession(this._session);
        }
        this._runner = undefined;
        this._session = undefined;
    }

    async _createPlayId() {
        return (
            await prisma.play.create({
                data: {
                    contentId: this._param.contentId,
                    gameMasterId: this._param.playerId,
                    gmUserId: this._param.playerUserId,
                },
            })
        ).id;
    }

    async _deletePlayId(playId: number) {
        await prisma.play.delete({
            where: {
                id: playId,
            },
        });
    }

    async _fetchPlayToken(playId: number) {
        const res = await fetch(
            `${this._param.storageUrl}/start?playId=${playId}`,
        );
        if (res.status !== 200) {
            throw new Error(
                `failed to start because of storage-server error. (cause = "${await res.text()}")`,
            );
        }
        const { playToken } = (await res.json()) as { playToken: string };
        return playToken;
    }

    _openSession(playId: number, playToken: string) {
        const session = (this._session = Session(this._param.storageUrl, {
            socketType: ProtocolType.WebSocket,
            validationData: {
                playId: playId.toString(),
                token: playToken,
            },
        }));
        session.on("error", (err) => {
            console.error("error on session", err);
        });
        return session;
    }

    async _closeSession(session: SessionLike) {
        await new Promise<void>((resolve) => {
            session.close((msg) => {
                if (msg) {
                    console.log(
                        `session of runnerId = "${this._runner?.runnerId}" (playId = "${this._runner?.playId}") was ended.`,
                        msg,
                    );
                }
                resolve();
            });
        });
    }

    async _createAMFlow(session: SessionLike) {
        return await new Promise<AMFlow>((resolve, reject) => {
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
        });
    }

    async _createRunner(playId: number, playToken: string, amflow: AMFlow) {
        const runner = (this._runner = new RunnerV3({
            contentUrl: this._param.contentUrl,
            assetBaseUrl: this._param.assetBaseUrl,
            configurationUrl: this._param.configurationUrl,
            playId: playId.toString(),
            playToken: playToken,
            runnerId: playId.toString(),
            amflow,
            executionMode: "active",
            trusted: true,
            external: {},
            externalValue: {},
            loadFileHandler: (url, encoding, cb) => {
                if (
                    !url.startsWith(this._param.assetBaseUrl) &&
                    !url.startsWith(this._param.configurationUrl)
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
        }));
        runner.errorTrigger.add((err) => {
            console.error(
                `error on runner "${runner.runnerId}", playId = "${playId}")`,
                err,
            );
            runner.stop();
        });
        const game = await runner.start({ paused: false });
        if (!game) {
            throw new Error(
                `failed to start runner (runnerId = "${runner.runnerId}", playId = "${playId}")`,
            );
        }
        return runner;
    }

    _initGame(amflow: AMFlow, playId: number) {
        amflow.sendEvent([0x0, 0, playId.toString(), this._param.playerName]);
    }

    async _endPlay(playId: number) {
        const res = await fetch(
            `${this._param.storageUrl}/end?playId=${playId}`,
        );
        if (res.status !== 200) {
            console.warn(
                `failed to end because of storage-server error. (cause = "${await res.text()}")`,
            );
        }
    }
}
