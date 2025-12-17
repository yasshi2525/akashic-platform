import type { DataBus } from "@cross-border-bridge/data-bus";
import {
    ScaleMode,
    VerticalAlignment,
    HorizontalAlignment,
} from "./akashic-gameview";
import { ObjectList } from "./utils";
import { ErrorFactory } from "./Error";
import { GameContentSharedObject, GameViewSharedObject } from "./SharedObject";
import { Rect } from "./DomElement";

interface ContentLoadListener {
    onLoad(loadingSec: number): void;
}
interface ErrorListener {
    onError(error: Error): void;
}
interface ContentDestroyListener {
    onDestroy(): void;
}

interface ContentLayout {
    /**
     * {@link ScaleMode}
     */
    scaleMode: number;
    /**
     * {@link VerticalAlignment}
     */
    verticalAlignment: number;
    /**
     * {@link HorizontalAlignment}
     */
    horizontalAlignment: number;
    passthroughEvent: boolean;
    backgroundColor: string;
}

export interface ContentParameterObject {
    contentUrl: string;
    contentArea: Rect | null;
    zIndex: number | null;
    contentLayout: ContentLayout | null;
}

export abstract class Content {
    id: number | null;
    vars: Record<string, unknown>;
    type: string;

    _contentLoadListeners: ObjectList<ContentLoadListener>;
    _errorListeners: ObjectList<ErrorListener>;
    _contentDestroyListeners: ObjectList<ContentDestroyListener>;
    _contentAreaNeedsUpdate: boolean;
    _zIndexNeedsUpdate: boolean;
    _contentLayout: ContentLayout;
    _contentLayoutNeedsUpdate: boolean;
    _visibility: boolean;
    _visibilityNeedsUpdate: boolean;
    _contentUrl: string;
    _gameViewShared: GameViewSharedObject | null;
    _gameContentShared: GameContentSharedObject | null;
    _contentArea: Rect | null;
    _zIndex: number | null;
    _dataBus: DataBus | null;

    constructor(params: ContentParameterObject, type: string) {
        this._contentLoadListeners = new ObjectList();
        this._errorListeners = new ObjectList();
        this._contentDestroyListeners = new ObjectList();
        this._contentAreaNeedsUpdate = false;
        this._zIndexNeedsUpdate = false;
        this._contentLayout = {
            scaleMode: ScaleMode.AspectFit,
            verticalAlignment: VerticalAlignment.Center,
            horizontalAlignment: HorizontalAlignment.Center,
            passthroughEvent: true,
            backgroundColor: "transparent",
        };
        this._contentLayoutNeedsUpdate = false;
        this._visibility = true;
        this._visibilityNeedsUpdate = false;
        this.id = null;
        this.vars = {};
        this.type = type;
        this._contentUrl = params.contentUrl;
        if (params.contentArea) {
            this.setContentArea(params.contentArea);
        }
        if (params.zIndex != null) {
            this.setZIndex(params.zIndex);
        }
        if (params.contentLayout) {
            this.setContentLayout(params.contentLayout);
        }
        this._gameContentShared = null;
        this._gameViewShared = null;
        this._contentArea = null;
        this._zIndex = null;
        this._dataBus = null;
    }

    destroy() {
        this._contentDestroyListeners.forEach((l) => l.onDestroy());
    }

    addContentLoadListener(listener: ContentLoadListener) {
        this._contentLoadListeners.addItem(listener);
    }

    removeContentLoadListener(listener: ContentLoadListener) {
        this._contentLoadListeners.removeItem(listener);
    }

    addErrorListener(listener: ErrorListener) {
        this._errorListeners.addItem(listener);
    }

    removeErrorListener(listener: ErrorListener) {
        this._errorListeners.removeItem(listener);
    }

    addContentDestroyListener(listener: ContentDestroyListener) {
        this._contentDestroyListeners.addItem(listener);
    }

    removeContentDestroyListener(listener: ContentDestroyListener) {
        this._contentDestroyListeners.removeItem(listener);
    }

    setContentArea(area: Rect) {
        this._contentArea = {
            ...this._contentArea,
            ...area,
        };
        this._contentAreaNeedsUpdate = true;
        this._update();
    }

    getContentArea() {
        return { ...this._contentArea };
    }

    setZIndex(zIndex: number) {
        this._zIndex = zIndex;
        this._zIndexNeedsUpdate = true;
        this._update();
    }

    getZIndex() {
        return this._zIndex;
    }

    moveTopMost() {
        if (this._gameContentShared) {
            this.setZIndex(this._gameContentShared.largestZIndex + 1);
        } else {
            const err = ErrorFactory.createInvalidOperationError("moveTopMost");
            this._errorListeners.forEach((l) => l.onError(err));
        }
    }

    setContentLayout(layout: ContentLayout) {
        this._contentLayout = { ...this._contentLayout, ...layout };
        this._contentLayoutNeedsUpdate = true;
        this._update();
    }

    getContentLayout() {
        return { ...this._contentLayout };
    }

    hide() {
        if (this._visibility) {
            this._visibility = false;
            this._visibilityNeedsUpdate = true;
            this._update();
        }
    }

    show() {
        if (!this._visibility) {
            this._visibility = true;
            this._visibilityNeedsUpdate = true;
            this._update();
        }
    }

    isVisible() {
        return this._visibility;
    }

    getDataBus() {
        return this._dataBus;
    }

    abstract start(
        viewShared: GameViewSharedObject,
        contentShared: GameContentSharedObject,
    ): void;
    abstract _update(): void;
}
