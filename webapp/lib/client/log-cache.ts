import { ClientCapturedLog } from "../types";

export class LogCache {
    private _entries: ClientCapturedLog[];
    private _max: number;

    constructor() {
        this._entries = [];
        this._max = parseInt(
            process.env.CLIENT_LOG_CACHE_MAX_ENTRIES ?? "1000",
        );
    }

    push(entry: ClientCapturedLog): void {
        this._entries.push(entry);
        if (this._entries.length > this._max) {
            this._entries.shift();
        }
    }

    getAll(): ClientCapturedLog[] {
        return [...this._entries];
    }

    clear(): void {
        this._entries = [];
    }
}
