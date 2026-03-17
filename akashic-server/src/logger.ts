import { AsyncLocalStorage } from "node:async_hooks";
import * as util from "node:util";

export interface PlayContext {
    playId: number;
    contentId: number;
}

export const playStorage = new AsyncLocalStorage<PlayContext>();

export function installConsoleOverride(): void {
    const _origLog = console.log.bind(console);
    const _origWarn = console.warn.bind(console);
    const _origError = console.error.bind(console);

    const patchedLog = (
        level: "info" | "warn" | "error",
        args: unknown[],
        output: (line: string) => void,
    ) => {
        const ctx = playStorage.getStore();
        if (ctx == null) {
            output(util.format(...args));
            return;
        }
        output(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                playId: ctx.playId,
                contentId: ctx.contentId,
                message: util.format(...args),
            }),
        );
    };

    console.log = (...args: unknown[]) => patchedLog("info", args, _origLog);
    console.info = (...args: unknown[]) => patchedLog("info", args, _origLog);
    console.debug = (...args: unknown[]) => patchedLog("info", args, _origLog);
    console.warn = (...args: unknown[]) => patchedLog("warn", args, _origWarn);
    console.error = (...args: unknown[]) => patchedLog("error", args, _origError);
}
