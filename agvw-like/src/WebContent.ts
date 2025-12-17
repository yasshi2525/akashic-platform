import { PostMessageDataBus } from "@cross-border-bridge/post-message-data-bus";
import { Content, ContentParameterObject } from "./Content";
import { WebContentElement } from "./DomElement";
import { GameContentSharedObject, GameViewSharedObject } from "./SharedObject";

interface WebContentParameterObject extends ContentParameterObject {}

export class WebContent extends Content {
    _element: WebContentElement | null;

    constructor(param: WebContentParameterObject) {
        super(param, "web");
        this._element = null;
    }

    start(
        viewShared: GameViewSharedObject,
        contentShared: GameContentSharedObject,
    ) {
        const startingTime = new Date().getTime();
        this._gameViewShared = viewShared;
        this._gameContentShared = contentShared;
        this._element = new WebContentElement(
            contentShared.gameViewElement,
            this._contentUrl,
            () => {
                const duration = (new Date().getTime() - startingTime) / 1000;
                // NOTE: 元のコードではコンストラクタ引数を Nullable としているが、型定義と合わないため ! をつけている
                this._dataBus = new PostMessageDataBus(
                    this._element!.getContentWindow()!,
                );
                this._contentLoadListeners.forEach((e) => e.onLoad(duration));
            },
        );
        if (!this._contentArea) {
            this.setContentArea({
                x: 0,
                y: 0,
                width: contentShared.viewWidth,
                height: contentShared.viewHeight,
            });
        }
        if (this._zIndex == null) {
            this.setZIndex(++contentShared.largestZIndex);
        }
    }

    _update() {
        if (this._element) {
            if (this._contentAreaNeedsUpdate) {
                // NOTE: _contentArea は start() で代入済み
                this._element.setContentArea(this._contentArea!);
                this._contentAreaNeedsUpdate = false;
            }
            if (this._zIndexNeedsUpdate) {
                // NOTE: _gameContentShared, _zIndex は start() で代入済み
                this._element.setZIndex(this._zIndex!);
                this._gameContentShared!.largestZIndex = Math.max(
                    this._gameContentShared!.largestZIndex,
                    this._zIndex!,
                );
                this._zIndexNeedsUpdate = false;
            }
            if (this._contentLayoutNeedsUpdate) {
                this._element.setContentLayout(this._contentLayout);
                this._contentAreaNeedsUpdate = false;
            }
            if (this._visibilityNeedsUpdate) {
                this._element.setVisibility(this._visibility);
                this._visibilityNeedsUpdate = false;
            }
        }
    }

    override destroy() {
        // NOTE: _element は start() で代入済み
        this._element!.destroy();
        super.destroy();
    }
}
