import { ClientCapturedLog } from "../types";
import { LogStore } from "./log-store";

export class LogHandler {
    private readonly _store: LogStore;

    constructor(store: LogStore) {
        this._store = store;
    }

    captureUncaughtError(win: Window) {
        win.addEventListener("error", (event) => {
            this.append("error", event.error || event.message);
        });
    }

    captureConsole(c: Console) {
        c.log = new Proxy(c.log, {
            apply: (target, thisArg, argArray) => {
                target.apply(thisArg, argArray);
                this.append("log", ...argArray);
            },
        });
        c.warn = new Proxy(c.warn, {
            apply: (target, thisArg, argArray) => {
                target.apply(thisArg, argArray);
                this.append("warn", ...argArray);
            },
        });
        c.error = new Proxy(c.error, {
            apply: (target, thisArg, argArray) => {
                target.apply(thisArg, argArray);
                this.append("error", ...argArray);
            },
        });
    }

    append(level: ClientCapturedLog["level"], ...args: unknown[]) {
        try {
            const timestamp = Date.now();
            let message = this._formatMessage(...args);
            // console.error は解析しやすくするため stacktrace を生成する
            if (level === "error" && !args.some((a) => a instanceof Error)) {
                message += this._generateCurrentTrace();
            }
            for (const line of message.split("\n")) {
                this._store.push({
                    level,
                    message: line,
                    timestamp,
                });
            }
        } catch (err) {
            /* ignore */
        }
    }

    _generateCurrentTrace() {
        const callStack = new Error().stack;
        if (callStack) {
            // 先頭2行（"Error"ヘッダーとこのオーバーライド関数自身のフレーム）を除去
            const trimmed = callStack.split("\n").slice(2).join("\n");
            return "\n" + trimmed;
        }
        return "";
    }

    _formatMessage(...args: unknown[]) {
        return args.map((v) => this._formatValue(v)).join(" ");
    }

    _formatValue(v: unknown) {
        if (typeof v === "string") {
            return v;
        }
        if (
            v instanceof Error ||
            (typeof v === "object" &&
                v &&
                "name" in v &&
                v.name === "Error" &&
                "message" in v)
        ) {
            if ("stack" in v && v.stack) {
                return `${v.message}\n${v.stack}`;
            } else {
                return v.toString();
            }
        }
        try {
            return JSON.stringify(v);
        } catch {
            return String(v);
        }
    }
}
