import { ClientCapturedLog } from "../types";
import { LogStore } from "./log-store";

export class LogHandler {
    private readonly _store: LogStore;

    constructor(store: LogStore) {
        this._store = store;
    }

    captureUncaughtError(win: Window) {
        win.addEventListener("error", (event) => {
            this.append("error", event.error ?? event.message ?? event);
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
        try {
            if (typeof v === "string") {
                return v;
            }
            if (this._isError(v)) {
                return this._formatError(v);
            }
            return this._formatObject(v);
        } catch {
            return String(v);
        }
    }

    _isError(v: unknown): v is Error {
        return (
            typeof v === "object" &&
            v != null &&
            "name" in v &&
            v.name === "Error" &&
            "message" in v
        );
    }

    _formatError(v: Error) {
        if (v.stack != null) {
            return `${v.message}\n${v.stack}`;
        } else {
            return String(v);
        }
    }

    _isTracable(v: unknown): v is { stack: string } {
        return (
            typeof v === "object" &&
            v != null &&
            "stack" in v &&
            v.stack != null
        );
    }

    _formatTracable(v: { stack: string }) {
        return `${v.toString()}\n${v.stack}`;
    }

    _formatObject(v: unknown) {
        try {
            const result = JSON.stringify(v);
            if (result === "{}") {
                if (this._isTracable(v)) {
                    return this._formatTracable(v);
                }
                return String(v);
            }
            return result;
        } catch {
            return String(v);
        }
    }
}
