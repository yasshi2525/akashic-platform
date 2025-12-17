import { PostMessageBridgeDemux } from "./bridge/PostMessageBridgeDemux";
import { ExternalPluginManager } from "./ExternalPluginManager";
import { RetryDownloader, XhrDownloader } from "./Downloader";
import { SessionManager } from "./SessionManager";
import { ScriptManager } from "./ScriptManager";
import { GameViewElement } from "./DomElement";

interface GameViewSharedObjectParameterObject {
    baseDownloader: XhrDownloader | undefined;
    window: Window | undefined;
    untrustedFrameUrl: string | undefined;
    trustedChildOrigin: RegExp;
    untrustedFrameTargetOrigin: string | undefined;
}

export class GameViewSharedObject {
    pluginManager: ExternalPluginManager;
    sessionManager: SessionManager;
    scriptManager: ScriptManager;
    downloader: RetryDownloader;
    bridgeDemux: PostMessageBridgeDemux;
    untrustedFrameUrl: string | undefined;
    untrustedFrameTargetOrigin: string | null;

    constructor(param: GameViewSharedObjectParameterObject | null) {
        this.pluginManager = new ExternalPluginManager();
        this.sessionManager = new SessionManager();
        this.scriptManager = new ScriptManager(undefined);
        this.downloader = new RetryDownloader(param?.baseDownloader);
        this.bridgeDemux = new PostMessageBridgeDemux(
            param?.window ?? window,
            param?.trustedChildOrigin,
        );
        this.untrustedFrameUrl = param?.untrustedFrameUrl;
        this.untrustedFrameTargetOrigin =
            param?.untrustedFrameTargetOrigin ?? null;
    }

    destroy() {
        this.pluginManager = null!;
        this.sessionManager = null!;
        this.scriptManager = null!;
        this.downloader = null!;
        if (this.bridgeDemux) {
            this.bridgeDemux.destroy();
        }
        this.bridgeDemux = null!;
    }

    destroyed() {
        return this.bridgeDemux == null;
    }
}

interface GameContentSharedObjectParameterObject {
    gameViewElement: GameViewElement;
    gameViewWidth: number;
    gameViewHeight: number;
}

export class GameContentSharedObject {
    gameViewElement: GameViewElement;
    largestZIndex: number;
    viewWidth: number;
    viewHeight: number;

    constructor(params: GameContentSharedObjectParameterObject) {
        this.gameViewElement = params.gameViewElement;
        this.largestZIndex = 0;
        this.viewWidth = params.gameViewWidth;
        this.viewHeight = params.gameViewHeight;
    }
}
