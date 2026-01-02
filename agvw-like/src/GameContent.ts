import type * as g from "@akashic/akashic-engine";
import type { Player } from "@akashic/akashic-engine";
import type { AMFlow } from "@akashic/amflow";
import type { Event } from "@akashic/playlog";
import type { AudioPluginStatic, Platform } from "@akashic/pdi-browser";
import type { ProxyAudioHandlerSet } from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioHandlerSet";
import { MemoryQueue } from "@cross-border-bridge/memory-queue";
import { MemoryQueueDataBus } from "@cross-border-bridge/memory-queue-data-bus";
import {
    EventDropPolicy,
    ExecutionMode,
    ScaleMode,
    DroppedEventType,
    DroppedEventReason,
} from "./akashic-gameview";
import { Content, ContentParameterObject } from "./Content";
import {
    DroppedDomEventListener,
    GameContentElement,
    Rect,
} from "./DomElement";
import { GameLoader, PlayConfig } from "./GameLoader";
import { TrustedGameLoader } from "./TrustedGameLoader";
import { UntrustedGameLoader } from "./UntrustedGameLoader";
import {
    calcAspectFitLayout,
    calcFillLayout,
    calcNoneLayout,
    LayoutParameterObject,
} from "./CalcLayout";
import { GameContentSharedObject, GameViewSharedObject } from "./SharedObject";
import {
    FunctionTableMetadata,
    FunctionTableObjectMetadata,
} from "./ExternalPluginSignatureCaller";
import { ErrorFactory } from "./Error";
import { ObjectList } from "./utils";

interface ResponedEngineConfig {
    /**
     * @default []
     */
    engine_urls?: string[];
    /**
     * @default []
     */
    external?: string[];
    /**
     * @default false
     */
    untrusted?: boolean;
    /**
     * @default false
     */
    runInIframe?: boolean;
}

export interface EngineConfig extends ResponedEngineConfig {
    engine_urls: string[];
    external: string[];
    content_url: string;
    asset_base_url?: string;
}

export interface GameLoaderCustomizer {
    /**
     * stringify された config
     */
    overwriteEngineConfig: string | null;
    createCustomAmflowClient: (() => AMFlow) | null;
    createCustomAudioPlugins: (() => AudioPluginStatic[]) | null;
    platformCustomizer: (platform: Platform, param: { g: typeof g }) => void;
}

interface GameContentParameterObject extends ContentParameterObject {
    player: Player;
    playConfig: PlayConfig;
    untrustedFrameUrl?: string;
    untrustedFrameTargetOrigin?: string;
    argument?: GameContentArgument;
    pause?: boolean;
    initialEvents?: Event[];
    untrusted?: boolean;
    runInIframe?: boolean;
    gameLoaderCustomizer?: GameLoaderCustomizer;
    audioPdiHandlers?: ProxyAudioHandlerSet;
    /**
     * {@link EventDropPolicy}
     * @default EventDropPolicy.InReplay
     */
    eventDropPolicy?: number;
    /**
     * @default "0"
     */
    tabIndex?: string;
}

interface SkippingListener {
    onSkip: (t: boolean) => void;
}

/**
 * @param {number} type {@link DroppedEventType}
 * @param {number} reason {@link DroppedEventReason}
 */
type DroppedListener = (ev: { type: number; reason: number }) => void;

type ClickableAreasListener = (areas: Rect[] | null) => void;

interface GameContentArgument {
    agv: {
        disableDropEventInReplay: boolean;
    } | null;
}

export class GameContent extends Content {
    _skippingListeners: ObjectList<SkippingListener>;
    _clickableAreasListeners: ObjectList<ClickableAreasListener>;
    _droppedListeners: ObjectList<DroppedListener>;
    /**
     * timestamp
     */
    _loadStartTime: number;
    _isRunning: boolean;
    _isReplay: boolean;
    _naturalWidth: number;
    _naturalHeight: number;
    _innerArea: Rect;
    _bufferingNaturalWidth: number | null;
    _bufferingNaturalHeight: number | null;
    _updatePrimarySurfaceSizeTimeoutId: number | null;
    /**
     * timestamp
     */
    _lastUpdatePrimarySurfaceSizeTime: number | null;
    _updatePrimarySurfaceSizeDelay: number;
    _untrusted: boolean;
    _replayData: null;
    _engineConfig: EngineConfig | null;
    _destroyed: boolean;
    _clickableRegions: Rect[] | null;
    /**
     * {@link EventDropPolicy}
     */
    _eventDropPolicy: number | undefined;
    _isDropEventNeedsUpdate: boolean;
    _handleDroppedDomEvent_bound: DroppedDomEventListener;
    _player: Player;
    _playConfig: PlayConfig;
    _untrustedFrameUrl: string | undefined;
    _untrustedFrameTargetOrigin: string | undefined;
    _argument: GameContentArgument | undefined;
    _pauseOnStart: boolean;
    _initialEvents: Event[] | undefined;
    _givenUntrusted: boolean | undefined;
    _givenRunInIframe: boolean;
    _customizer: GameLoaderCustomizer | undefined;
    _audioPdiHandlers: ProxyAudioHandlerSet | undefined;
    _tabIndex: string;
    _loader: GameLoader | null;
    _element: GameContentElement | null;
    _pluginDataBus: MemoryQueueDataBus | null;

    constructor(param: GameContentParameterObject) {
        super(param, "game");
        this._skippingListeners = new ObjectList();
        this._clickableAreasListeners = new ObjectList();
        this._droppedListeners = new ObjectList();
        this._loadStartTime = 0;
        this._isRunning = false;
        this._isReplay = false;
        this._naturalWidth = 0;
        this._naturalHeight = 0;
        this._innerArea = { x: 0, y: 0, width: 0, height: 0 };
        this._bufferingNaturalWidth = null;
        this._bufferingNaturalHeight = null;
        this._updatePrimarySurfaceSizeTimeoutId = null;
        this._lastUpdatePrimarySurfaceSizeTime = null;
        this._updatePrimarySurfaceSizeDelay = 1000;
        this._untrusted = false;
        this._replayData = null;
        this._engineConfig = null;
        this._destroyed = false;
        this._clickableRegions = null;
        this._eventDropPolicy = undefined;
        this._isDropEventNeedsUpdate = false;
        this._handleDroppedDomEvent_bound =
            this._handleDroppedDomEvent.bind(this);
        // NOTE: superクラスでも同じことをやっいて謎のコードだがそのまま移植
        this._contentUrl = param.contentUrl;
        this._player = param.player;
        this._playConfig = param.playConfig;
        this._untrustedFrameUrl = param.untrustedFrameUrl;
        this._untrustedFrameTargetOrigin = param.untrustedFrameTargetOrigin;
        this._argument = param.argument;
        this._pauseOnStart = param.pause ?? false;
        this._initialEvents = param.initialEvents;
        this._givenUntrusted = param.untrusted;
        this._givenRunInIframe = param.runInIframe ?? false;
        this._customizer = param.gameLoaderCustomizer;
        this._audioPdiHandlers = param.audioPdiHandlers;
        if (param.eventDropPolicy != null) {
            this._eventDropPolicy = param.eventDropPolicy;
        }
        this._tabIndex = param.tabIndex ?? "0";
        this._loader = null;
        this._element = null;
        this._pluginDataBus = null;
    }

    start(
        viewShared: GameViewSharedObject,
        contentShared: GameContentSharedObject,
    ) {
        this._loadStartTime = new Date().getTime();
        this._gameViewShared = viewShared;
        this._gameContentShared = contentShared;
        if (this._customizer?.overwriteEngineConfig != null) {
            const config = this._customizer.overwriteEngineConfig;
            setTimeout(() => this._start_createElement(config), 0);
        } else {
            this._gameViewShared.downloader.start(
                this._contentUrl,
                (err, cb) => {
                    if (err) {
                        this._fireError(
                            ErrorFactory.createHttpRequestError(err),
                        );
                    } else {
                        this._start_createElement(cb);
                    }
                },
            );
        }
    }

    _parseEngineConfig(stringifiedConfig: string) {
        try {
            const config = JSON.parse(
                stringifiedConfig,
            ) as ResponedEngineConfig;
            if (!config.engine_urls) {
                config.engine_urls = [];
            }
            if (!config.external) {
                config.external = [];
            }
            return config as EngineConfig;
        } catch (err) {
            this._fireError(ErrorFactory.createInvalidGameError(err as Error));
            return null;
        }
    }

    _start_createElement(stringifiedConfig: string) {
        // NOTE: _gameContentShared は 呼び出し元の start() で代入済み
        if (!this._destroyed) {
            this._engineConfig = this._parseEngineConfig(stringifiedConfig);
            if (this._engineConfig) {
                // NOTE: _givenUntrusted, EngineConfig#untrusted は undefined の場合がある。元も === true かチェックしている
                this._untrusted =
                    this._givenUntrusted ??
                    this._engineConfig.untrusted ??
                    false;
                this._element = new GameContentElement({
                    parent: this._gameContentShared!.gameViewElement,
                    frameSrc:
                        this._untrustedFrameUrl ??
                        // NOTE: _gameViewShared は 呼び出し元の start() で代入済み
                        this._gameViewShared!.untrustedFrameUrl ??
                        null,
                    onCreated: (win, div) => this._start_startLoader(win, div),
                    runInIframe:
                        this._givenRunInIframe ||
                        (this._engineConfig.runInIframe ?? false),
                });
                this._element.addDroppedDomEventListener(
                    this._handleDroppedDomEvent_bound,
                );
                if (!this._contentArea) {
                    this.setContentArea({
                        x: 0,
                        y: 0,
                        // NOTE: _gameContentShared は 呼び出し元の start() で代入済み
                        width: this._gameContentShared!.viewWidth,
                        height: this._gameContentShared!.viewHeight,
                    });
                }
                // NOTE: this._zIndex は number | null なので === null でもよいが、念の為もとのコードにあわせて undefined のケースを考慮している (多分ないと思うが…)
                if (this._zIndex == null) {
                    this.setZIndex(++this._gameContentShared!.largestZIndex);
                }
                if (this._dataBus == null) {
                    this._initDataBus();
                }
            }
        }
    }

    _start_startLoader(win: Window, div: HTMLDivElement) {
        // NOTE: _gameViewShared は 呼び出し元の start() で代入済み
        // NOTE: _engineConfig は 呼び出し元の _start_createElement() で代入済み
        if (!this._destroyed) {
            if (this._untrusted) {
                const untrustHostName = this._getUntrustedFrameHostname();
                const hostname = win.location.hostname;
                if (
                    !untrustHostName ||
                    (hostname !== "" && untrustHostName.indexOf(hostname) === 0)
                ) {
                    this._fireError(
                        ErrorFactory.createInsecureFrameUrlError(undefined),
                    );
                    return;
                }
                this._loader = new UntrustedGameLoader({
                    engineConfig: this._engineConfig!,
                    shared: this._gameViewShared!,
                    customizer: this._customizer,
                    audioPdiHandler: this._audioPdiHandlers,
                    // NOTE: _element は呼び出し元の _start_createElement() で代入済み
                    // NOTE: contentWindow は NonNullable じゃないと動かない
                    contentWindow: this._element!.getContentWindow()!,
                    targetOrigin: this._getUntrustedTargetOrigin(),
                });
            } else {
                this._loader = new TrustedGameLoader({
                    engineConfig: this._engineConfig!,
                    shared: this._gameViewShared!,
                    customizer: this._customizer,
                    audioPdiHandler: this._audioPdiHandlers,
                    window: win,
                });
            }
            const content = this._engineConfig!.external.reduce(
                (caller, pluginName) => {
                    const plugin =
                        this._gameViewShared!.pluginManager.find(pluginName);
                    if (plugin?.untrustedSignature) {
                        caller[plugin.name] = plugin.untrustedSignature;
                    }
                    return caller;
                },
                {} as Record<string, FunctionTableMetadata>,
            );
            const externalPluginSignature: FunctionTableObjectMetadata = {
                type: "object",
                content,
            };
            this._loader.start({
                parentHtmlElement: div,
                contentUrl: this._contentUrl,
                initialEvents: this._initialEvents,
                argument: this._argument,
                pause: this._pauseOnStart,
                player: this._player,
                playConfig: this._playConfig,
                gameCreatedHandler: (game) => {
                    if (this._loader) {
                        this._workaroundEngine(div);
                        this._handleGameArgument(this._argument);
                        this._loader.setTabIndex(this._tabIndex);
                        this._naturalWidth = game.width;
                        this._naturalHeight = game.height;
                        this._contentLayoutNeedsUpdate = true;
                        this._isReplay =
                            this._playConfig.executionMode ===
                            ExecutionMode.Replay;
                        this._isDropEventNeedsUpdate = true;
                        this._isRunning = true;
                        this._update();
                        const pluginNames: string[] = [];
                        const registerPlugin = (pluginName: string) => {
                            if (pluginNames.indexOf(pluginName) !== -1) {
                                const plugin =
                                    this._gameViewShared!.pluginManager.find(
                                        pluginName,
                                    );
                                if (plugin) {
                                    pluginNames.push(pluginName);
                                    if (plugin.requires) {
                                        plugin.requires.forEach(registerPlugin);
                                    }
                                    try {
                                        plugin.onload(
                                            game,
                                            // NOTE: _pluginDataBus は _start_createElement() で代入済み
                                            this.getPluginDataBus()!,
                                            this,
                                        );
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }
                            }
                        };
                        this._engineConfig!.external.forEach(registerPlugin);
                        this._gameViewShared!.pluginManager.implicitPluginNames().forEach(
                            registerPlugin,
                        );
                        // NOTE: 元のコードでは handle を呼び出しているが、非推奨なので推奨の add にした
                        game.skippingChangedTrigger?.add((t) => {
                            this._skippingListeners.forEach((e) => e.onSkip(t));
                        });
                        const loadingSec =
                            (new Date().getTime() - this._loadStartTime) / 1000;
                        this._contentLoadListeners.forEach((listener) =>
                            listener.onLoad(loadingSec),
                        );
                    }
                },
                errorHandler: (err) => {
                    this._errorListeners.forEach((listener) =>
                        listener.onError(err),
                    );
                },
                gameFinishedHandler: () => {
                    this._isRunning = false;
                },
                replayData: this._replayData ?? this._playConfig.replayData,
                externalPluginSignature,
            });
        }
    }

    _update() {
        if (this._element) {
            if (
                this._contentAreaNeedsUpdate ||
                this._contentLayoutNeedsUpdate
            ) {
                // NOTE: _contentArea は _start_createElement() で代入済み
                this._element.setContentArea(this._contentArea!);
                this._element.setContentLayout(this._contentLayout);
                const param: LayoutParameterObject = {
                    outerWidth: this._contentArea!.width,
                    outerHeight: this._contentArea!.height,
                    naturalWidth: this._naturalWidth,
                    naturalHeight: this._naturalHeight,
                    horizontalAlignment:
                        this._contentLayout.horizontalAlignment,
                    verticalAlignment: this._contentLayout.verticalAlignment,
                };
                let rect: Rect;
                switch (this._contentLayout.scaleMode) {
                    case ScaleMode.AspectFit:
                        rect = calcAspectFitLayout(param);
                        break;
                    case ScaleMode.Fill:
                        rect = calcFillLayout(param);
                        break;
                    default:
                        rect = calcNoneLayout(param);
                        break;
                }
                this._element.setInnerSize(rect);
                this._innerArea = rect;
                if (this._isRunning && this._loader) {
                    if (
                        this._loader.resizablePrimarySurface &&
                        (rect.width !== this._naturalWidth ||
                            rect.height !== this._naturalHeight)
                    ) {
                        this._requestResizePrimarySurface(
                            rect.width,
                            rect.height,
                        );
                    }
                    this._loader.setScale(
                        rect.width / this._naturalWidth,
                        rect.height / this._naturalHeight,
                    );
                }
                this._contentAreaNeedsUpdate = false;
                this._contentLayoutNeedsUpdate = false;
                this._notifyClickableAreas();
            }
            if (this._zIndexNeedsUpdate) {
                // NOTE: _zIndex は _start_createElement() で代入済み
                this._element.setZIndex(this._zIndex!);
                // NOTE: _gameContentShared は start() で代入済み
                this._gameContentShared!.largestZIndex = Math.max(
                    this._gameContentShared!.largestZIndex,
                    this._zIndex!,
                );
                this._zIndexNeedsUpdate = false;
            }
            if (this._visibilityNeedsUpdate) {
                this._element.setVisibility(this._visibility);
                this._visibilityNeedsUpdate = false;
            }
            if (this._isDropEventNeedsUpdate) {
                this._updateDropEvent();
                this._isDropEventNeedsUpdate = false;
            }
        }
    }

    _initDataBus() {
        const queue1 = new MemoryQueue();
        const queue2 = new MemoryQueue();
        this._dataBus = new MemoryQueueDataBus(queue2, queue1);
        this._pluginDataBus = new MemoryQueueDataBus(queue1, queue2);
    }

    override destroy() {
        if (this._destroyed) {
            if (this._loader) {
                this._loader.stopGame();
                // NOTE: 元の実装に合わせて undefined に設定. destroy() 後の操作はないと仮定し、型は | null に絞ってる
                this._loader = undefined!;
            }
            if (this._pluginDataBus) {
                this._pluginDataBus.destroy();
                // NOTE: 元の実装に合わせて undefined に設定. destroy() 後の操作はないと仮定し、型は | null に絞ってる
                this._pluginDataBus = undefined!;
            }
            if (this._dataBus) {
                this._dataBus.destroy();
                // NOTE: 元の実装に合わせて undefined に設定. destroy() 後の操作はないと仮定し、型は | null に絞ってる
                this._dataBus = undefined!;
            }
            if (this._element) {
                this._element.destroy();
                // NOTE: 元の実装に合わせて undefined に設定. destroy() 後の操作はないと仮定し、型は | null に絞ってる
                this._element = undefined!;
            }
            // NOTE: 元の実装に合わせて undefined に設定. destroy() 後の操作はないと仮定し、型は | null に絞ってる
            this._innerArea = undefined!;
            this._destroyed = true;
            this._cancelResizePrimarySurface();
            super.destroy();
        }
    }

    pause() {
        if (this._loader) {
            this._loader.pauseGame();
        } else {
            this._fireInvalidOperationError("pause");
        }
    }

    resume() {
        if (this._loader) {
            this._loader.resumeGame();
        } else {
            this._fireInvalidOperationError("resume");
        }
    }

    isPaused() {
        if (this._loader) {
            return this._loader.isPaused();
        } else {
            return this._pauseOnStart;
        }
    }

    /**
     * @param eventDropPolicy {@link EventDropPolicy}
     */
    setEventDropPolicy(eventDropPolicy: number) {
        if (!this._loader) {
            this._fireInvalidOperationError("setEventDropPolicy");
        }
        if (this._eventDropPolicy !== eventDropPolicy) {
            this._eventDropPolicy = eventDropPolicy;
            this._isDropEventNeedsUpdate = true;
            this._update();
        }
    }

    /**
     * @returns EventDropPolicy {@link EventDropPolicy}
     */
    getEventDropPolicy() {
        if (this._eventDropPolicy != null) {
            return this._eventDropPolicy;
        }
        return EventDropPolicy.InReplay;
    }

    /**
     * @param executionMode {@link ExecutionMode}
     */
    setExecutionMode(executionMode: number) {
        if (this._loader) {
            this._loader.setExecutionMode(executionMode);
        } else {
            this._fireInvalidOperationError("setExecutionMode");
        }
    }

    /**
     * @returns ExecutionMode {@link ExecutionMode}
     */
    getExecutionMode() {
        if (this._loader) {
            return this._loader.getExecutionMode();
        }
        return this._playConfig.executionMode;
    }

    setReplayTargetTimeFunc(replayTargetTimeFunc: () => number) {
        if (this._loader) {
            this._loader.setReplayTargetTimeFunc(replayTargetTimeFunc);
        }
    }

    getReplayTargetTimeFunc() {
        if (this._loader) {
            return this._loader.getReplayTargetTimeFunc();
        } else {
            return null;
        }
    }

    setReplayOriginDate(replayOriginDate: number) {
        if (this._loader) {
            this._loader.setReplayOriginDate(replayOriginDate);
        } else {
            this._fireInvalidOperationError("setReplayOriginDate");
        }
    }

    getReplayOriginDate() {
        if (this._loader) {
            return this._loader.getReplayOriginDate();
        } else {
            return null;
        }
    }

    getAverageFramePerSecond(handler: (fps: number) => void) {
        if (this._loader) {
            setTimeout(() => {
                handler(this._loader?.fps ?? 0);
            }, 0);
        } else {
            this._fireInvalidOperationError("getAverageFramePerSecond");
        }
    }

    addSkippingListener(listener: SkippingListener) {
        this._skippingListeners.addItem(listener);
    }

    removeSkippingListener(listener: SkippingListener) {
        this._skippingListeners.removeItem(listener);
    }

    addDroppedEventListener(listener: DroppedListener) {
        this._droppedListeners.addItem(listener);
    }

    removeDroppedEventListener(listener: DroppedListener) {
        this._droppedListeners.removeItem(listener);
    }

    sendEvents(events: Event[]) {
        if (this._loader) {
            this._loader.sendEvents(events);
        } else {
            this._fireInvalidOperationError("sendEvents");
        }
    }

    getPlayOriginDate() {
        if (this._loader) {
            return this._loader.getPlayOriginDate();
        } else {
            return null;
        }
    }

    getGameVars(propName: string, listener: (vars: unknown) => void) {
        if (this._loader) {
            this._loader.getGameVars(propName, listener);
        } else {
            this._fireInvalidOperationError("getGameVars");
        }
    }

    getGame() {
        if (this._loader) {
            return this._loader.game;
        }
        this._fireInvalidOperationError("getGame");
        return undefined;
    }

    getGameDriver() {
        if (this._loader) {
            return this._loader.driver;
        }
        this._fireInvalidOperationError("getGameDriver");
        return undefined;
    }

    getPluginDataBus() {
        return this._pluginDataBus;
    }

    dumpPlaylog() {
        if (this._loader) {
            return this._loader.dumpPlaylog();
        } else {
            return null;
        }
    }

    getGameContentSize() {
        const game = this.getGame();
        return { width: game!.width, height: game!.height };
    }

    setGameContentSize(rect: { width: number; height: number }) {
        if (this._loader) {
            this._loader.resetPrimarySurface(rect.width, rect.height);
            this._naturalWidth = rect.width;
            this._naturalHeight = rect.height;
            return;
        }
        this._fireInvalidOperationError("setGameContentSize");
    }

    getMasterVolume() {
        if (this._loader) {
            return this._loader.getMasterVolume();
        } else {
            this._fireInvalidOperationError("getMasterVolume");
            return null;
        }
    }

    setMasterVolume(masterVolume: number) {
        if (this._loader) {
            this._loader.setMasterVolume(masterVolume);
        } else {
            this._fireInvalidOperationError("setMasterVolume");
        }
    }

    setTabIndex(tabIndex: string) {
        if (this._loader) {
            this._loader.setTabIndex(tabIndex);
        } else {
            this._fireInvalidOperationError("setTabIndex");
        }
    }

    getTabIndex() {
        return this._tabIndex;
    }

    getClickableAreas() {
        if (this._clickableRegions == null) {
            return null;
        }
        return this._clickableRegions.map((rect) =>
            this._areaOfGameScreenRegion(rect),
        );
    }

    addClickableAreasListener(listener: ClickableAreasListener) {
        this._clickableAreasListeners.addItem(listener);
    }

    removeClickableAreasListener(listener: ClickableAreasListener) {
        this._clickableAreasListeners.removeItem(listener);
    }

    handleSetClickableRegions(regions: Rect[]) {
        this._clickableRegions = regions;
        this._notifyClickableAreas();
    }

    _notifyClickableAreas() {
        const clickableAreas =
            this._clickableRegions?.map((region) =>
                this._areaOfGameScreenRegion(region),
            ) ?? null;
        this._clickableAreasListeners.forEach((listener) =>
            listener(clickableAreas),
        );
    }

    _areaOfGameScreenRegion(region: Rect) {
        // NOTE: _contentArea は _start_createElement() で代入済み
        return {
            x:
                this._contentArea!.x +
                this._innerArea.x +
                (region.x * this._innerArea.width) / this._naturalWidth,
            y:
                this._contentArea!.y +
                this._innerArea.y +
                (region.y * this._innerArea.height) / this._naturalHeight,
            width: (region.width * this._innerArea.width) / this._naturalWidth,
            height:
                (region.height * this._innerArea.height) / this._naturalHeight,
        };
    }

    _fireInvalidOperationError(cause: string) {
        this._fireError(ErrorFactory.createInvalidOperationError(cause));
    }

    _fireError(err: Error) {
        this._errorListeners.forEach((listener) => listener.onError(err));
    }

    _getUntrustedTargetOrigin() {
        if (this._untrustedFrameTargetOrigin != null) {
            return this._untrustedFrameTargetOrigin;
        }
        if (
            !this._untrustedFrameUrl &&
            this._gameViewShared?.untrustedFrameTargetOrigin != null
        ) {
            return this._gameViewShared.untrustedFrameTargetOrigin;
        }
        const untrustedFrameUrl =
            this._untrustedFrameUrl || this._gameViewShared?.untrustedFrameUrl;
        if (!untrustedFrameUrl) {
            return null;
        }
        const matched = untrustedFrameUrl.match(/^(https?:\/\/[^\/]*)\//);
        if (matched && matched[1]) {
            return matched[1];
        } else {
            return null;
        }
    }

    _getUntrustedFrameHostname() {
        const untrustedFrameUrl =
            this._untrustedFrameUrl || this._gameViewShared?.untrustedFrameUrl;
        if (!untrustedFrameUrl) {
            return null;
        }
        const matched = untrustedFrameUrl.match(
            /^https?:\/\/([^\/:]*)(?::\d+)?\//,
        );
        if (matched && matched[1]) {
            return matched[1];
        } else {
            return null;
        }
    }

    _workaroundEngine(div: HTMLDivElement) {
        const elements = div.getElementsByClassName("input-handler");
        for (let i = 0; i < elements.length; i++) {
            elements[i].setAttribute("tabindex", "0");
        }
    }

    _handleGameArgument(arg: GameContentArgument | undefined) {
        if (arg && arg.agv) {
            if (
                arg.agv.disableDropEventInReplay &&
                this._eventDropPolicy === undefined
            ) {
                this._eventDropPolicy = EventDropPolicy.Never;
                this._isDropEventNeedsUpdate = true;
            }
        }
    }

    _requestResizePrimarySurface(width: number, height: number) {
        this._bufferingNaturalWidth = Math.ceil(width);
        this._bufferingNaturalHeight = Math.ceil(height);
        this._lastUpdatePrimarySurfaceSizeTime = Date.now();
        if (this._updatePrimarySurfaceSizeTimeoutId == null) {
            const handler = () => {
                if (
                    Date.now() <
                    this._lastUpdatePrimarySurfaceSizeTime! +
                        this._updatePrimarySurfaceSizeDelay
                ) {
                    this._updatePrimarySurfaceSizeTimeoutId = window.setTimeout(
                        handler,
                        this._updatePrimarySurfaceSizeDelay,
                    );
                } else {
                    this._naturalWidth = this._bufferingNaturalWidth!;
                    this._naturalHeight = this._bufferingNaturalHeight!;
                    this._bufferingNaturalWidth = null;
                    this._bufferingNaturalHeight = null;
                    // NOTE: loader は _start_startLoader() で代入済み
                    this._loader!.setScale(1, 1);
                    this._loader!.resetPrimarySurface(
                        this._naturalWidth,
                        this._naturalHeight,
                    );
                    this._updatePrimarySurfaceSizeTimeoutId = null;
                }
            };
            this._updatePrimarySurfaceSizeTimeoutId = window.setTimeout(
                handler,
                this._updatePrimarySurfaceSizeDelay,
            );
        }
    }

    _cancelResizePrimarySurface() {
        if (this._updatePrimarySurfaceSizeTimeoutId != null) {
            window.clearTimeout(this._updatePrimarySurfaceSizeTimeoutId);
            this._updatePrimarySurfaceSizeTimeoutId = null;
        }
    }

    _handleDroppedDomEvent(type: number, _: MouseEvent | TouchEvent) {
        const ev = {
            type,
            reason: DroppedEventReason.Replay,
        };
        this._droppedListeners.forEach((listener) => listener(ev));
    }

    _updateDropEvent() {
        // NOTE: _element _start_createElement() で代入済み
        const dropPolicy = this._eventDropPolicy ?? EventDropPolicy.InReplay;
        const isDrop =
            dropPolicy === EventDropPolicy.Always ||
            (dropPolicy === EventDropPolicy.InReplay && this._isReplay);
        this._element!.setDropDomEvent(isDrop);
    }
}
