import { ClientCapturedLog } from "../types";

export class LogStore {
    private _entries: ClientCapturedLog[];
    private _max: number;
    private _truncated: boolean;

    constructor(maxEntries: number = 1000) {
        this._entries = [];
        this._max = maxEntries;
        this._truncated = false;
    }

    setMaxEntries(max: number) {
        this._max = max;
    }

    push(entry: ClientCapturedLog) {
        this._entries.push(entry);
        if (this._entries.length > this._max) {
            this._entries.shift();
            this._truncated = true;
        }
    }

    get truncated() {
        return this._truncated;
    }

    getAll() {
        return [...this._entries];
    }

    clear() {
        this._entries = [];
        this._truncated = false;
    }
}
