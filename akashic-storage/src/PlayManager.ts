import { AMFlowServer } from "./AMFlowServer";

interface PlayManagerParameterObject {
    amfServer: AMFlowServer;
}

export class PlayManager {
    _amfServer: AMFlowServer;
    _nextId: number;

    constructor(param: PlayManagerParameterObject) {
        this._amfServer = param.amfServer;
        this._nextId = 1;
    }

    generateId() {
        const playId = `play${this._nextId}`;
        this._nextId++;
        return playId;
    }

    start(playId: string) {
        this._amfServer.start(playId);
    }

    end(playId: string) {
        this._amfServer.end(playId);
    }
}
