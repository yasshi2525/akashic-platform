import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { Runner, RunnerParameterObject } from "./runner";

interface RunnerManagerParameterObject {
    storageUrl: string;
}

export type RunnerStartParameterObject = Omit<
    RunnerParameterObject,
    "playId" | "playToken" | "storageUrl"
>;

export class RunnerManager {
    _storageUrl: string;
    _runners: Map<number, Runner>;

    constructor(param: RunnerManagerParameterObject) {
        this._storageUrl = param.storageUrl;
        this._runners = new Map();
    }

    async start(param: RunnerStartParameterObject) {
        const runner = new Runner({
            storageUrl: this._storageUrl,
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
