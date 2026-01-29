import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { Runner, RunnerParameterObject } from "./runner";

interface RunnerManagerParameterObject {
    storagePublicUrl: string;
    storageAdminUrl: string;
    storageAdminToken: string;
}

export type RunnerStartParameterObject = Omit<
    RunnerParameterObject,
    | "playId"
    | "playToken"
    | "storagePublicUrl"
    | "storageAdminUrl"
    | "storageAdminToken"
>;

export class RunnerManager {
    _storagePublicUrl: string;
    _storageAdminUrl: string;
    _storageAdminToken: string;
    _runners: Map<number, Runner>;

    constructor(param: RunnerManagerParameterObject) {
        this._storagePublicUrl = param.storagePublicUrl;
        this._storageAdminUrl = param.storageAdminUrl;
        this._storageAdminToken = param.storageAdminToken;
        this._runners = new Map();
    }

    async start(param: RunnerStartParameterObject) {
        const runner = new Runner({
            storagePublicUrl: this._storagePublicUrl,
            storageAdminUrl: this._storageAdminUrl,
            storageAdminToken: this._storageAdminToken,
            ...param,
        });
        const playId = await runner.start();
        this._runners.set(playId, runner);
        return playId;
    }

    async end(playId: number, reason: PlayEndReason) {
        const runner = this._runners.get(playId);
        if (runner) {
            await runner.end(reason);
        }
    }

    unregister(playId: number) {
        this._runners.delete(playId);
    }

    getRemaining(playId: number) {
        return this._runners.get(playId)?.getRemaining();
    }

    async extend(playId: number) {
        const runner = this._runners.get(playId);
        if (!runner) {
            return { ok: false, reason: "NotFound" } as const;
        }
        return await runner.extend();
    }

    async destroy() {
        await Promise.all(
            [...this._runners.entries()].map(async ([playId, runner]) => {
                console.log(
                    `runner (playId = "${playId}") is destroying forcibly.`,
                );
                await runner.end("INTERNAL_ERROR");
            }),
        );
    }
}
