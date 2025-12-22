import { AMFlowServerManager } from "./AMFlowServerManager";

interface PlayManagerParameterObject {
    amfManager: AMFlowServerManager;
}

export class PlayManager {
    _amfManager: AMFlowServerManager;
    _nextId: number;

    constructor(param: PlayManagerParameterObject) {
        this._amfManager = param.amfManager;
        this._nextId = 1;
    }

    generateId() {
        const playId = `play${this._nextId}`;
        this._nextId++;
        return playId;
    }

    start(playId: string) {
        return this._amfManager.start(playId);
    }

    async end(playId: string) {
        await this._amfManager.end(playId);
    }
}
