import { ClientCapturedLog } from "../types";

export class LogCache {
    private _entries: ClientCapturedLog[];
    private _max: number;
    private _truncated: boolean;

    constructor() {
        this._entries = [];
        this._max = parseInt(
            process.env.CLIENT_LOG_CACHE_MAX_ENTRIES ?? "1000",
        );
        this._truncated = false;
    }

    push(entry: ClientCapturedLog): void {
        this._entries.push(entry);
        if (this._entries.length > this._max) {
            this._entries.shift();
            this._truncated = true;
        }
    }

    get truncated(): boolean {
        return this._truncated;
    }

    getAll(): ClientCapturedLog[] {
        return [...this._entries];
    }

    clear(): void {
        this._entries = [];
        this._truncated = false;
    }
}
