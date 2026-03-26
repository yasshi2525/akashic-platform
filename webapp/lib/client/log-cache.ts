import { ClientCapturedLog } from "../types";

const DEFAULT_MAX_ENTRIES = 1000;

export class LogCache {
    private _entries: ClientCapturedLog[] = [];
    private _max: number;

    constructor() {
        const raw = process.env.NEXT_PUBLIC_LOG_CACHE_MAX_ENTRIES;
        const parsed = raw ? parseInt(raw, 10) : NaN;
        this._max = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ENTRIES;
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
