import {
    AkashicGameView,
    ExecutionMode,
    GameContent,
} from "@yasshi2525/agvw-like";
import { User } from "../types";
import { destroyAkashicGameView } from "./akashic-gameview-destroyer";

interface AkashicContainerParameterObject {
    parent: HTMLDivElement;
    user: User;
    contentId: number;
    playId: string;
    playToken: string;
    playlogServerUrl: string;
    onSkip: (skip: boolean) => void;
    onError: (errMsg: string) => void;
}

export class AkashicContainer {
    _view: AkashicGameView;
    _resizeObserver: ResizeObserver;
    _isDestroyed: boolean;

    constructor(param: AkashicContainerParameterObject) {
        this._view = new AkashicGameView({
            container: param.parent,
            width: param.parent.clientWidth,
            height: param.parent.clientHeight,
            // NOTE: untrusted のときこの値が使用される。 akashic-cli-serve の値としている。
            trustedChildOrigin: /.*/,
        });
        const content = this._createContent(param);
        this._resizeObserver = this._createResizeObserver(
            param.parent,
            content,
        );
        this._view.addContent(content);
        this._isDestroyed = false;
    }

    async destroy() {
        if (!this._isDestroyed) {
            this._resizeObserver.disconnect();
            // NOTE: agvw 実装は作成した div 要素を削除しないので手動で削除している
            this._view._gameContentShared.gameViewElement.destroy();
            await destroyAkashicGameView(this._view);
            this._resizeObserver = null!;
            this._view = null!;
        }
        this._isDestroyed = true;
    }

    _createContent(param: AkashicContainerParameterObject) {
        const content = new GameContent({
            player: {
                id: param.user.id,
                name: param.user.name,
            },
            playConfig: {
                playId: param.playId,
                playToken: param.playToken,
                executionMode: ExecutionMode.Passive,
                playlogServerUrl: param.playlogServerUrl,
            },
            contentUrl: `/api/content/${param.contentId}`,
        });
        content.addSkippingListener({
            onSkip: (isSkipping) => {
                param.onSkip(isSkipping);
            },
        });
        content.addErrorListener({
            onError: (err) => {
                param.onError(
                    "予期しないエラーが発生しました。画面を更新してください。",
                );
                console.error(err);
                content.pause();
            },
        });
        return content;
    }

    _createResizeObserver(target: HTMLDivElement, content: GameContent) {
        const observer = new ResizeObserver((entries) => {
            for (const e of entries.filter((e) => e.target === target)) {
                content.setContentArea({
                    x: 0,
                    y: 0,
                    width: e.contentRect.width,
                    height: e.contentRect.height,
                });
            }
        });
        observer.observe(target);
        return observer;
    }
}
