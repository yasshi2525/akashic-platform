import type { AMFlow } from "@akashic/amflow";
import { EventCode, JoinEvent, MessageEvent } from "@akashic/playlog";
import { RunnerV3 } from "@akashic/headless-driver";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { prisma } from "@yasshi2525/persist-schema";
import {
    AMFlowClient,
    Session,
    SessionLike,
} from "@yasshi2525/playlog-client-like";
import type { PassThrough } from "node:stream";
import type { Upload } from "@aws-sdk/lib-storage";
import { playStorage } from "./logger";
import { createPlayLogUpload } from "./s3Logger";

/**
 * `akashic-gameview` の ProtocolType と同じ。
 * NOTE: `akashic-gameview` 自体を元プロジェクトと同様に独立させてもよいが、
 * これしか使用してないためコピペですませた。
 */
const ProtocolType = {
    WebSocket: 0,
} as const;

const PLAY_DURATION_MS = 30 * 60 * 1000;
const EXTEND_WINDOW_MS = 10 * 60 * 1000;
const EXTEND_MS = 30 * 60 * 1000;

export interface RunnerParameterObject {
    storagePublicUrl: string;
    storageAdminUrl: string;
    storageAdminToken: string;
    playName: string;
    contentId: number;
    contentUrl: string;
    assetBaseUrl: string;
    configurationUrl: string;
    playerId: string;
    playerUserId?: string;
    playerName: string;
    isLimited: boolean;
    joinWord?: string;
    inviteHash?: string;
    onDestroy: (playId: number) => void;
}

export class Runner {
    _param: RunnerParameterObject;
    _runner?: RunnerV3;
    _session?: SessionLike;
    _onPlayEndBound: (reason: PlayEndReason) => void;
    _playId?: number;
    _expiresAt?: number;
    _timeoutId?: NodeJS.Timeout;
    _crashing = false;
    _errorLogged = false;
    _logStream?: PassThrough;
    _upload?: Upload;

    constructor(param: RunnerParameterObject) {
        this._param = param;
        this._onPlayEndBound = this._onPlayEnd.bind(this);
    }

    async start() {
        if (this._runner || this._session) {
            throw new Error(
                `runner (runnerId = "${this._runner?.runnerId}", playId = "${this._runner?.playId}") has already started.`,
            );
        }
        const playId = await this._createPlayId();
        this._playId = playId;

        const { logStream, upload } = createPlayLogUpload(
            this._param.contentId,
            playId,
        );
        this._logStream = logStream;
        this._upload = upload;

        return await playStorage.run(
            { playId, contentId: this._param.contentId, logStream },
            async () => {
                try {
                    const playToken = await this._fetchPlayToken(playId);
                    this._session = this._openSession(playId, playToken);
                    const amflow = await this._createAMFlow(this._session);
                    this._subscribePlayEnd(amflow);
                    this._runner = await this._createRunner(
                        playId,
                        playToken,
                        amflow,
                    );
                    this._initGame(amflow);
                    this._setTimer(Date.now() + PLAY_DURATION_MS);
                    return playId;
                } catch (err) {
                    this._clearTimer();
                    logStream.destroy();
                    upload.abort().catch(() => {});
                    this._logStream = undefined;
                    this._upload = undefined;
                    this._deletePlayId(playId);
                    throw err;
                }
            },
        );
    }

    async end(
        reason: PlayEndReason,
        notifyPlaylogServer = true,
    ): Promise<void> {
        if (this._playId != null && playStorage.getStore() == null) {
            return playStorage.run(
                {
                    playId: this._playId,
                    contentId: this._param.contentId,
                    logStream: this._logStream,
                },
                () => this.end(reason, notifyPlaylogServer),
            );
        }
        this._clearTimer();
        if (this._runner) {
            const playId = parseInt(this._runner.playId);
            // playlogServer に終了要求を出すと PlayEnd が飛んでくる。
            // onPlayEnd が反応して二重削除してしまわないようリスナを解除
            this._unsubscribePlayEnd(this._runner);
            this._runner.stop();
            if (notifyPlaylogServer) {
                try {
                    await this._endPlay(playId, reason);
                } catch (err) {
                    console.warn(
                        `failed to end play (playId = "${playId}")`,
                        err,
                    );
                }
            }
            await this._endPlayRecord(playId);
            this._param.onDestroy(playId);

            // fire-and-forget: S3 アップロード・DB 更新・通知作成
            const logStream = this._logStream;
            const upload = this._upload;
            const crashing = this._crashing;
            const errorLogged = this._errorLogged;
            if (logStream && upload) {
                this._runBackgroundUpload(
                    playId,
                    logStream,
                    upload,
                    crashing,
                    errorLogged,
                ).catch((err) => {
                    console.warn(
                        `background upload failed (playId = "${playId}")`,
                        err,
                    );
                });
            }
        }
        if (this._session) {
            this._closeSession(this._session);
        }
        this._runner = undefined;
        this._session = undefined;
        this._playId = undefined;
        this._logStream = undefined;
        this._upload = undefined;
    }

    getRemaining() {
        if (this._expiresAt == null) {
            return undefined;
        }
        return {
            remainingMs: Math.max(this._expiresAt - Date.now(), 0),
            expiresAt: this._expiresAt,
        };
    }

    async extend(): Promise<
        | { ok: false; reason: "NotFound" }
        | {
              ok: false;
              reason: "TooEarly";
              remainingMs: number;
              expiresAt: number;
          }
        | { ok: true; expiresAt: number; remainingMs: number; extendMs: number }
    > {
        if (this._playId != null && playStorage.getStore() == null) {
            return playStorage.run(
                { playId: this._playId, contentId: this._param.contentId },
                () => this.extend(),
            );
        }
        if (this._expiresAt == null || this._playId == null) {
            return { ok: false, reason: "NotFound" } as const;
        }
        const remainingMs = this._expiresAt - Date.now();
        if (remainingMs > EXTEND_WINDOW_MS) {
            return {
                ok: false,
                reason: "TooEarly",
                remainingMs,
                expiresAt: this._expiresAt,
            } as const;
        }
        this._expiresAt += EXTEND_MS;
        this._setTimer(this._expiresAt);
        const payload = {
            expiresAt: this._expiresAt,
            remainingMs: Math.max(this._expiresAt - Date.now(), 0),
            extendMs: EXTEND_MS,
        };
        await this._notifyExtend(this._playId, payload);
        return { ok: true, ...payload } as const;
    }

    async _createPlayId() {
        return (
            await prisma.play.create({
                data: {
                    contentId: this._param.contentId,
                    gameMasterId: this._param.playerId,
                    gmUserId: this._param.playerUserId,
                    name: this._param.playName,
                    isLimited: this._param.isLimited,
                    joinWord: this._param.joinWord,
                    inviteHash: this._param.inviteHash,
                },
            })
        ).id;
    }

    async _deletePlayId(playId: number) {
        try {
            await prisma.play.delete({
                where: {
                    id: playId,
                },
            });
        } catch (err) {
            console.warn(`failed to delete playId "${playId}"`, err);
        }
    }

    async _endPlayRecord(playId: number) {
        try {
            await prisma.play.update({
                where: { id: playId },
                data: {
                    isActive: false,
                    endedAt: new Date(),
                },
            });
        } catch (err) {
            console.warn(
                `failed to end play record (playId = "${playId}")`,
                err,
            );
        }
    }

    async _runBackgroundUpload(
        playId: number,
        logStream: PassThrough,
        upload: Upload,
        crashing: boolean,
        errorLogged: boolean,
    ): Promise<void> {
        logStream.end();

        let uploadSucceeded = false;
        try {
            await upload.done();
            uploadSucceeded = true;
        } catch (err) {
            console.warn(
                `failed to upload play log (playId = "${playId}")`,
                err,
            );
        }

        try {
            await prisma.play.update({
                where: { id: playId },
                data: {
                    crashed,
                    errorLogged,
                    ...(uploadSucceeded ? { logUploadedAt: new Date() } : {}),
                },
            });
        } catch (err) {
            console.warn(
                `failed to update play log status (playId = "${playId}")`,
                err,
            );
            return;
        }

        if (!uploadSucceeded) return;

        if (crashing) {
            await this._notifyGameCrashed(playId).catch((err) => {
                console.warn(
                    `failed to create GAME_CRASHED notification (playId = "${playId}")`,
                    err,
                );
            });
        }
        if (errorLogged) {
            await this._notifyGameErrorLogged(playId).catch((err) => {
                console.warn(
                    `failed to create GAME_ERROR_LOGGED notification (playId = "${playId}")`,
                    err,
                );
            });
        }
    }

    async _fetchPlayToken(playId: number) {
        const res = await fetch(
            `${this._param.storageAdminUrl}/start?playId=${playId}`,
            {
                headers: {
                    "x-akashic-internal-token": this._param.storageAdminToken,
                },
            },
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
        const session = (this._session = Session(
            `${this._param.storagePublicUrl}/socket.io`,
            {
                socketType: ProtocolType.WebSocket,
                validationData: {
                    playId: playId.toString(),
                    token: playToken,
                },
            },
        ));
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
        return await new Promise<AMFlowClient>((resolve, reject) => {
            session.open((err) => {
                if (err) {
                    reject(err);
                } else {
                    session.createClient(
                        {
                            usePrimaryChannel: true,
                            maxPreservingTickSize: 2,
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

    _subscribePlayEnd(amflow: AMFlowClient) {
        amflow.onPlayEnd(this._onPlayEndBound);
    }

    _unsubscribePlayEnd(runner: RunnerV3) {
        (runner.amflow as AMFlowClient).offPlayEnd(this._onPlayEndBound);
    }

    _onPlayEnd(reason: PlayEndReason) {
        // playlogServer から終了要求がくるのは playlogServer のシャットダウン時
        // playlogServer 側で終了処理は実行済みなため、通知はしない
        this.end(reason, false);
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
        runner.errorTrigger.add(async (err) => {
            this._crashing = true;
            console.error(
                `error on runner "${runner.runnerId}", playId = "${playId}")`,
                err,
                (err as any).cause,
            );
            await this.end("INTERNAL_ERROR");
        });
        const ctx = playStorage.getStore();
        if (ctx) {
            ctx.onError = () => {
                if (this._crashing || this._errorLogged) return;
                this._errorLogged = true;
            };
        }
        const game = await runner.start({ paused: false });
        if (!game) {
            throw new Error(
                `failed to start runner (runnerId = "${runner.runnerId}", playId = "${playId}")`,
            );
        }
        return runner;
    }

    _initGame(amflow: AMFlow) {
        amflow.sendEvent([
            EventCode.Join,
            0,
            this._param.playerId,
            this._param.playerName,
        ] as JoinEvent);
        amflow.sendEvent([
            EventCode.Message,
            0,
            ":akashic",
            {
                type: "start",
                parameters: {
                    mode: "multi",
                    service: "nicolive",
                },
            },
        ] as MessageEvent);
    }

    async _endPlay(playId: number, reason: PlayEndReason) {
        const res = await fetch(
            `${this._param.storageAdminUrl}/end?playId=${playId}&reason=${reason}`,
            {
                headers: {
                    "x-akashic-internal-token": this._param.storageAdminToken,
                },
            },
        );
        if (res.status !== 200) {
            console.warn(
                `failed to end because of storage-server error. (cause = "${await res.text()}")`,
            );
        }
    }

    _setTimer(expiresAt: number) {
        this._clearTimer();
        this._expiresAt = expiresAt;
        const delay = Math.max(expiresAt - Date.now(), 0);
        this._timeoutId = setTimeout(async () => {
            await this.end("TIMEOUT");
        }, delay);
    }

    _clearTimer() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = undefined;
        }
        this._expiresAt = undefined;
    }

    async _notifyGameCrashed(playId: number): Promise<void> {
        const content = await prisma.content.findUnique({
            where: { id: this._param.contentId },
            select: {
                game: {
                    select: { id: true, title: true, publisherId: true },
                },
            },
        });
        if (!content) return;
        await prisma.notification.create({
            data: {
                userId: content.game.publisherId,
                unread: true,
                type: "GAME_CRASHED",
                body: `「${content.game.title}」がエラーで異常終了しました。`,
                link: `/game/${content.game.id}/logs#play-${playId}`,
            },
        });
    }

    async _notifyGameErrorLogged(playId: number): Promise<void> {
        const content = await prisma.content.findUnique({
            where: { id: this._param.contentId },
            select: {
                game: {
                    select: { id: true, title: true, publisherId: true },
                },
            },
        });
        if (!content) return;
        await prisma.notification.create({
            data: {
                userId: content.game.publisherId,
                unread: true,
                type: "GAME_ERROR_LOGGED",
                body: `「${content.game.title}」の実行中にエラーログが出力されました。`,
                link: `/game/${content.game.id}/logs#play-${playId}`,
            },
        });
    }

    async _notifyExtend(
        playId: number,
        payload: { expiresAt: number; remainingMs: number; extendMs: number },
    ) {
        const res = await fetch(`${this._param.storagePublicUrl}/extend`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                playId: playId.toString(),
                ...payload,
            }),
        });
        if (res.status !== 200) {
            console.warn(
                `failed to notify extend. (playId = "${playId}", cause = "${await res.text()}")`,
            );
        }
    }
}
