import { DroppedEventType } from "./akashic-gameview";
import { ObjectList } from "./utils";

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * @param type {@link DroppedEventType}
 */
export type DroppedDomEventListener = (
    type: number,
    e: MouseEvent | TouchEvent,
) => void;

interface WebContentLayout {
    backgroundColor: string;
}

interface GameContentLayout {
    backgroundColor: string;
    passthroughEvent: boolean;
}

const eventTypeMap = {
    mousedown: DroppedEventType.Down,
    mousemove: DroppedEventType.Move,
    mouseup: DroppedEventType.Up,
    touchstart: DroppedEventType.Down,
    touchmove: DroppedEventType.Move,
    touchend: DroppedEventType.Up,
    click: DroppedEventType.Click,
} as const;

export class GameViewElement {
    _parent: HTMLElement;
    _htmlElement: HTMLDivElement;

    constructor(parent: HTMLElement) {
        const div = document.createElement("div");
        div.style.position = "relative";
        div.style.overflow = "hidden";
        div.style.pointerEvents = "none";
        parent.appendChild(div);

        this._parent = parent;
        this._htmlElement = div;
    }

    appendChild(child: HTMLElement) {
        this._htmlElement.appendChild(child);
    }

    removeChild(child: HTMLElement) {
        this._htmlElement.removeChild(child);
    }

    destroy() {
        this._parent.removeChild(this._htmlElement);
    }

    setViewSize(width: number, height: number) {
        this._htmlElement.style.width = `${width}px`;
        this._htmlElement.style.height = `${height}px`;
    }
}

export class WebContentElement {
    _parent: GameViewElement;
    _htmlElement: HTMLIFrameElement;

    constructor(
        parent: GameViewElement,
        frameSrc: string,
        loadHandler: (elem: HTMLIFrameElement) => void,
    ) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.borderStyle = "none";
        iframe.style.pointerEvents = "auto";
        iframe.addEventListener("load", () => {
            setTimeout(() => {
                loadHandler(this._htmlElement);
            }, 0);
        });
        iframe.src = frameSrc;
        parent.appendChild(iframe);

        this._parent = parent;
        this._htmlElement = iframe;
    }

    destroy() {
        this._parent.removeChild(this._htmlElement);
    }

    setContentArea(rect: Rect) {
        this._htmlElement.style.left = `${rect.x}px`;
        this._htmlElement.style.top = `${rect.y}px`;
        this._htmlElement.style.width = `${rect.width}px`;
        this._htmlElement.style.height = `${rect.height}px`;
    }

    setContentLayout(layout: WebContentLayout) {
        this._htmlElement.style.backgroundColor = layout.backgroundColor;
    }

    setZIndex(zIndex: number) {
        this._htmlElement.style.zIndex = `${zIndex}`;
    }

    setVisibility(visible: boolean) {
        this._htmlElement.style.display = visible ? "block" : "none";
    }

    getContentWindow(): Window | null {
        return this._htmlElement.contentWindow;
    }
}

interface GameContentElementParameterObject {
    parent: GameViewElement;
    frameSrc: string | null;
    onCreated: (win: Window, div: HTMLDivElement) => void;
    runInIframe: boolean;
}

export class GameContentElement {
    _isDropDomEvent: boolean;
    _isTouched: boolean;
    _droppedDomEventListeners: ObjectList<DroppedDomEventListener>;
    _handleMouseDown_bound: (e: MouseEvent) => void;
    _handleMouseMove_bound: (e: MouseEvent) => void;
    _handleMouseUp_bound: (e: MouseEvent) => void;
    _handleTouchStart_bound: (e: TouchEvent) => void;
    _handleTouchMove_bound: (e: TouchEvent) => void;
    _handleTouchEnd_bound: (e: TouchEvent) => void;
    _handleClick_bound: (e: MouseEvent) => void;

    _parent: GameViewElement;
    _outerHtmlElement: HTMLDivElement;
    _innerHtmlElement: HTMLDivElement;
    _gameContainerHtmlElement: HTMLIFrameElement | HTMLDivElement;

    constructor(param: GameContentElementParameterObject) {
        this._isDropDomEvent = false;
        this._isTouched = false;
        this._droppedDomEventListeners = new ObjectList();
        this._handleMouseDown_bound = this._handleMouseDown.bind(this);
        this._handleMouseMove_bound = this._handleMouseMove.bind(this);
        this._handleMouseUp_bound = this._handleMouseUp.bind(this);
        this._handleTouchStart_bound = this._handleTouchStart.bind(this);
        this._handleTouchMove_bound = this._handleTouchMove.bind(this);
        this._handleTouchEnd_bound = this._handleTouchEnd.bind(this);
        this._handleClick_bound = this._handleClick.bind(this);
        const outer = document.createElement("div");
        outer.style.position = "absolute";
        outer.style.overflow = "hidden";
        outer.style.pointerEvents = "auto";
        let container: HTMLIFrameElement | HTMLDivElement;
        if (param.frameSrc) {
            const iframe = document.createElement("iframe");
            iframe.addEventListener("load", () => {
                setTimeout(() => {
                    param.onCreated(window, this._innerHtmlElement);
                }, 0);
            });
            iframe.sandbox = "allow-scripts allow-same-origin";
            iframe.src = param.frameSrc;
            // NOTE: 元の実装をそのまま移植
            iframe.scrolling = "no";
            container = iframe;
        } else if (param.runInIframe) {
            const iframe = document.createElement("iframe");
            iframe.name = "trusted-loader-window";
            // NOTE: 元の実装をそのまま移植
            iframe.scrolling = "no";
            iframe.addEventListener("load", () => {
                const win = iframe.contentWindow!;
                const document = iframe.contentDocument!;
                document.body.style.padding = "0";
                document.body.style.margin = "0";
                document.body.addEventListener("contextmenu", (e) =>
                    e.preventDefault(),
                );
                const div = document.createElement("div");
                document.body.appendChild(div);
                param.onCreated(win, div);
            });
            container = iframe;
        } else {
            const div = document.createElement("div");
            container = div;
            setTimeout(() => param.onCreated(window, div), 0);
        }

        container.style.position = "absolute";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.borderStyle = "none";
        container.style.overflow = "hidden";
        container.style.pointerEvents = "auto";

        const inner = document.createElement("div");
        inner.style.position = "absolute";
        inner.style.pointerEvents = "none";
        inner.appendChild(container);
        outer.appendChild(inner);
        param.parent.appendChild(outer);
        this._parent = param.parent;
        this._outerHtmlElement = outer;
        this._innerHtmlElement = inner;
        this._gameContainerHtmlElement = container;
    }

    destroy() {
        this._cleanupDropDomEventListeners();
        this._parent.removeChild(this._outerHtmlElement);
    }

    setInnerSize(rect: Rect) {
        this._innerHtmlElement.style.left = `${rect.x}px`;
        this._innerHtmlElement.style.top = `${rect.y}px`;
        this._innerHtmlElement.style.width = `${rect.width}px`;
        this._innerHtmlElement.style.height = `${rect.height}px`;
    }

    setContentArea(rect: Rect) {
        this._outerHtmlElement.style.left = `${rect.x}px`;
        this._outerHtmlElement.style.top = `${rect.y}px`;
        this._outerHtmlElement.style.width = `${rect.width}px`;
        this._outerHtmlElement.style.height = `${rect.height}px`;
    }

    setContentLayout(layout: GameContentLayout) {
        this._outerHtmlElement.style.backgroundColor = layout.backgroundColor;
        this._outerHtmlElement.style.pointerEvents = layout.passthroughEvent
            ? "none"
            : "auto";
    }

    setZIndex(zIndex: number) {
        this._outerHtmlElement.style.zIndex = `${zIndex}`;
    }

    setVisibility(visible: boolean) {
        this._outerHtmlElement.style.display = visible ? "block" : "none";
    }

    getContentWindow() {
        return (this._gameContainerHtmlElement as HTMLIFrameElement)
            .contentWindow;
    }

    addDroppedDomEventListener(listener: DroppedDomEventListener) {
        this._droppedDomEventListeners.addItem(listener);
    }

    removeDroppedDomEventListener(listener: DroppedDomEventListener) {
        this._droppedDomEventListeners.removeItem(listener);
    }

    setDropDomEvent(isDrop: boolean) {
        if (isDrop) {
            this._gameContainerHtmlElement.style.pointerEvents = "none";
            this._innerHtmlElement.style.pointerEvents = "auto";
            this._innerHtmlElement.addEventListener(
                "mousedown",
                this._handleMouseDown_bound,
            );
            this._innerHtmlElement.addEventListener(
                "touchstart",
                this._handleTouchStart_bound,
            );
            this._innerHtmlElement.addEventListener(
                "click",
                this._handleClick_bound,
            );
        } else {
            this._gameContainerHtmlElement.style.pointerEvents = "auto";
            this._innerHtmlElement.style.pointerEvents = "none";
            this._cleanupDropDomEventListeners();
        }
        this._isDropDomEvent = isDrop;
    }

    _cleanupDropDomEventListeners() {
        this._innerHtmlElement.removeEventListener(
            "mousedown",
            this._handleMouseDown_bound,
        );
        this._innerHtmlElement.removeEventListener(
            "touchstart",
            this._handleTouchStart_bound,
        );
        this._innerHtmlElement.removeEventListener(
            "click",
            this._handleClick_bound,
        );
        this._innerHtmlElement.removeEventListener(
            "touchmove",
            this._handleTouchMove_bound,
        );
        this._innerHtmlElement.removeEventListener(
            "touchend",
            this._handleTouchEnd_bound,
        );
        window.removeEventListener("mousemove", this._handleMouseMove_bound);
        window.removeEventListener("mouseup", this._handleMouseUp_bound);
    }

    _handleMouseDown(e: MouseEvent) {
        if (this._isTouched) {
            return;
        }
        window.addEventListener("mousemove", this._handleMouseMove_bound);
        window.addEventListener("mouseup", this._handleMouseUp_bound);
        this._fireDroppedDomEvent(e);
    }

    _handleMouseMove(e: MouseEvent) {
        if (this._isTouched) {
            return;
        }
        this._fireDroppedDomEvent(e);
    }

    _handleMouseUp(e: MouseEvent) {
        window.removeEventListener("mousemove", this._handleMouseMove_bound);
        window.removeEventListener("mouseup", this._handleMouseUp_bound);
        this._fireDroppedDomEvent(e);
    }

    _handleTouchStart(e: TouchEvent) {
        this._isTouched = true;
        this._innerHtmlElement.addEventListener(
            "touchmove",
            this._handleTouchMove_bound,
        );
        this._innerHtmlElement.addEventListener(
            "touchend",
            this._handleTouchEnd_bound,
        );
        this._fireDroppedDomEvent(e);
    }

    _handleTouchMove(e: TouchEvent) {
        this._fireDroppedDomEvent(e);
    }

    _handleTouchEnd(e: TouchEvent) {
        this._innerHtmlElement.removeEventListener(
            "touchmove",
            this._handleTouchMove_bound,
        );
        this._innerHtmlElement.removeEventListener(
            "touchend",
            this._handleTouchEnd_bound,
        );
        this._fireDroppedDomEvent(e);
    }

    _handleClick(e: MouseEvent) {
        this._isTouched = false;
        if (this._isDropDomEvent) {
            this._fireDroppedDomEvent(e);
        }
    }

    _fireDroppedDomEvent(e: MouseEvent | TouchEvent) {
        const type = eventTypeMap[e.type as keyof typeof eventTypeMap];
        if (type != null) {
            this._droppedDomEventListeners.forEach((listener) =>
                listener(type, e),
            );
        }
    }
}
