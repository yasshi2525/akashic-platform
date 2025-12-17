import type { SocketOptions } from "socket.io-client";
import { GameContentSharedObject, GameViewSharedObject } from "./SharedObject";
import { GameViewElement } from "./DomElement";
import { ErrorFactory } from "./Error";
import { Content } from "./Content";
import { ExternalPlugin } from "./ExternalPluginManager";
import { XhrDownloader } from "./Downloader";

interface AkashicGameViewParameterObject {
    container: HTMLElement;
    sharedObject: GameViewSharedObject | null;
    baseDownloader: XhrDownloader | undefined;
    window: Window;
    untrustedFrameUrl: string;
    trustedChildOrigin: RegExp;
    width: number;
    height: number;
}

export class AkashicGameView {
    vars: Record<string, unknown>;

    _contents: Record<string, Content>;
    _nextContentId: number;
    _hasOwnGameViewShared: boolean;
    _gameViewShared: GameViewSharedObject;
    _gameContentShared: GameContentSharedObject;

    constructor(params: AkashicGameViewParameterObject) {
        this._contents = {};
        this._nextContentId = 1;
        this._hasOwnGameViewShared = false;
        this.vars = {};
        const gameViewElement = new GameViewElement(params.container);
        if (params.sharedObject) {
            this._gameViewShared = params.sharedObject;
        } else {
            this._gameViewShared = new GameViewSharedObject({
                baseDownloader: params.baseDownloader,
                window: params.window,
                untrustedFrameUrl: params.untrustedFrameUrl,
                trustedChildOrigin: params.trustedChildOrigin,
                // NOTE: GameViewSharedObject 内で untrustedFrameTargetOrigin があれば設定しているが
                // 呼び出し時には特に何も設定してない
                untrustedFrameTargetOrigin: undefined,
            });
            this._hasOwnGameViewShared = true;
        }

        this._gameContentShared = new GameContentSharedObject({
            gameViewElement,
            gameViewWidth: params.width,
            gameViewHeight: params.height,
        });

        gameViewElement.setViewSize(params.width, params.height);
    }

    addContent(content: Content) {
        if (content.id != null) {
            throw ErrorFactory.createInvalidOperationError(
                `content already added: ${content.id}`,
            );
        }
        content.id = this._nextContentId++;
        content.start(this._gameViewShared, this._gameContentShared);
        this._contents[`${content.id}`] = content;
    }

    removeContent(content: Content) {
        if (content.id == null) {
            throw ErrorFactory.createInvalidOperationError(
                "content already removed",
            );
        }
        content.destroy();
        delete this._contents[`${content.id}`];
        content.id = null;
    }

    removeAllContents() {
        Object.keys(this._contents).forEach((id) => {
            this.removeContent(this._contents[id]);
        });
    }

    setSocketOptions(options: SocketOptions) {
        this._gameViewShared.sessionManager.setSocketOptions(options);
    }

    registerExternalPlugin(plugin: ExternalPlugin) {
        this._gameViewShared.pluginManager.register(plugin);
    }

    setViewSize(width: number, height: number) {
        this._gameContentShared.viewWidth = width;
        this._gameContentShared.viewHeight = height;
        this._gameContentShared.gameViewElement.setViewSize(width, height);
    }

    getViewSize() {
        return {
            width: this._gameContentShared.viewWidth,
            height: this._gameContentShared.viewHeight,
        };
    }

    getContentById(id: number) {
        return this._contents[`${id}`];
    }

    getGameViewSharedObject() {
        return this._gameViewShared;
    }

    destroy() {
        if (this.destroyed()) {
            return;
        }
        this.removeAllContents();
        if (this._hasOwnGameViewShared) {
            if (!this._gameViewShared.destroyed()) {
                this._gameViewShared.destroy();
            }
            this._hasOwnGameViewShared = false;
        }
        this._gameViewShared = null!;
        this._gameContentShared = null!;
    }

    destroyed() {
        return this._gameViewShared == null;
    }
}
