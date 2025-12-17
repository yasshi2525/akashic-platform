import type { AMFlow } from "@akashic/amflow";
import type { Event } from "@akashic/playlog";
import type { GameDriverInitializeParameterObject } from "@akashic/game-driver";
import type { ProxyAudioHandlerSet } from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioHandlerSet";
import { Trigger } from "@akashic/trigger";
import { ExecutionMode, ProtocolType } from "./akashic-gameview";
import { LoaderMessage } from "./bridge/LoaderMessage";
import {
    PostMessageBridgeBase,
    RawMessageEventDataCallback,
    RawMessageEventDataHandler,
} from "./bridge/PostMessageBridgeBase";
import { PostMessageDemuxedBridge } from "./bridge/PostMessageDemuxedBridge";
import { setupAMFlowProxy } from "./bridge/setupAMFlowPloxy";
import { setupAudioPdiProxy } from "./bridge/setupAudioPdiProxy";
import { EngineConfig, GameLoaderCustomizer } from "./GameContent";
import { GameViewSharedObject } from "./SharedObject";
import {
    GameLoader,
    GameLoaderStartParameterObject,
    MinimalGame,
} from "./GameLoader";
import {
    ExternalPluginSignatureCaller,
    TrustedFunctionArguments,
} from "./ExternalPluginSignatureCaller";
import { ErrorFactory } from "./Error";
import {
    findPlaylogClientUrl,
    detectPlaylogClientObject,
} from "./detectEngineFileObject";

interface GameProxyParameterObject {
    playId: string;
    width: number;
    height: number;
    fps: number;
}

class GameProxy implements MinimalGame {
    playId: string;
    width: number;
    height: number;
    fps: number;
    external: {
        send?: (value: unknown) => void;
    };
    skippingChangedTrigger: Trigger<boolean>;
    _started: Trigger<void>;
    _loaded: Trigger<void>;

    constructor(param: GameProxyParameterObject) {
        this.playId = param.playId;
        this.width = param.width;
        this.height = param.height;
        this.fps = param.fps;
        this.external = {};
        this.skippingChangedTrigger = new Trigger();
        this._started = new Trigger();
        this._loaded = new Trigger();
    }

    _setMuted(isMuted: boolean) {
        // no-op
        // NOTE:  GameLoader のインタフェース定義に合わせてダミー実装。
        // これが呼ばれることはない
    }
}

class GameDriverProxy {
    _bridge: PostMessageBridgeBase;

    constructor(bridge: PostMessageBridgeBase) {
        this._bridge = bridge;
    }

    changeState(
        param: GameDriverInitializeParameterObject,
        callback: (err: Error | null) => void,
    ) {
        this._bridge.request(LoaderMessage.ChangeDriverState, param, (err) => {
            if (err && "string" == typeof err) {
                callback(ErrorFactory.createGameDriverError(err));
            } else {
                callback(null);
            }
        });
    }
}

interface UntrustedGameLoaderParameterObject {
    engineConfig: EngineConfig;
    shared: GameViewSharedObject;
    customizer: GameLoaderCustomizer | null;
    audioPdiHandler: ProxyAudioHandlerSet | null;
    contentWindow: Window;
    targetOrigin: string | null;
}

export class UntrustedGameLoader implements GameLoader {
    /**
     * {@link ExecutionMode}
     */
    _agvExecutionMode: number | null;
    _amflowClient: AMFlow | null;
    _externalPluginCaller: ExternalPluginSignatureCaller | undefined;
    _isPaused: boolean;
    game: GameProxy | null;
    driver: GameDriverProxy | null;
    fps: number;
    resizablePrimarySurface: boolean;
    _teardownAudioPdiProxy: (() => void) | null;
    _teardownAMFlowProxy: (() => void) | null;
    _usingCustomAmflow: boolean;
    _shared: GameViewSharedObject;
    _customizer: GameLoaderCustomizer | null;
    _audioPdiHandler: ProxyAudioHandlerSet | null;
    _engineConfig: EngineConfig;
    _targetOrigin: string | null;
    _contentWindow: Window;
    _replayOriginDate: number;
    _playOriginDate: number | null;
    _masterVolume: number;
    _handleSessionManagerError_bound: (err: Error) => void;
    _handleGameCreated_bound: RawMessageEventDataHandler;
    _handleAcquireAMFlow_bound: RawMessageEventDataHandler;
    _handlePlayOriginDate_bound: RawMessageEventDataHandler;
    _handleExternalSend_bound: RawMessageEventDataHandler;
    _handleExternalPlugin_bound: RawMessageEventDataHandler;
    _handleSkippingChanged_bound: RawMessageEventDataHandler;
    _handleGameLoaded_bound: RawMessageEventDataHandler;
    _handleGameStarted_bound: RawMessageEventDataHandler;
    _notifyTargetTime_bound: RawMessageEventDataHandler;
    _param: GameLoaderStartParameterObject | null;
    _bridge: PostMessageDemuxedBridge | null;
    _replayTargetTimeFunc: (() => number) | undefined | null;
    _targetTimeNotifierTimer: number | undefined;

    constructor(param: UntrustedGameLoaderParameterObject) {
        this._agvExecutionMode = null;
        this._amflowClient = null;
        this._externalPluginCaller = undefined;
        this._isPaused = false;
        // NOTE: 元のコードは何故か一回 null に代入している
        // this._engineConfig = null;
        this.game = null;
        this.driver = null;
        this.fps = -1;
        this.resizablePrimarySurface = false;
        this._teardownAudioPdiProxy = null;
        this._teardownAMFlowProxy = null;
        this._usingCustomAmflow = false;
        this._shared = param.shared;
        this._customizer = param.customizer;
        this._audioPdiHandler = param.audioPdiHandler;
        this._engineConfig = param.engineConfig;
        this._targetOrigin = param.targetOrigin;
        this._contentWindow = param.contentWindow;
        this._replayOriginDate = 0;
        this._playOriginDate = null;
        this._masterVolume = 1;
        this._handleSessionManagerError_bound =
            this._handleSessionManagerError.bind(this);
        this._handleGameCreated_bound = this._handleGameCreated.bind(this);
        this._handleAcquireAMFlow_bound = this._handleAcquireAMFlow.bind(this);

        this._handlePlayOriginDate_bound =
            this._handlePlayOriginDate.bind(this);

        this._handleExternalSend_bound = this._handleExternalSend.bind(this);

        this._handleExternalPlugin_bound =
            this._handleExternalPlugin.bind(this);

        this._handleSkippingChanged_bound =
            this._handleSkippingChanged.bind(this);
        this._handleGameLoaded_bound = this._handleGameLoaded.bind(this);
        this._handleGameStarted_bound = this._handleGameStarted.bind(this);
        this._notifyTargetTime_bound = this._notifyTargetTime.bind(this);
        this._param = null;
        this._bridge = null;
        this._replayTargetTimeFunc = null;
        this._targetTimeNotifierTimer = undefined;
    }

    start(param: GameLoaderStartParameterObject) {
        this._param = param;
        this._isPaused = param.pause;
        this._replayTargetTimeFunc = param.playConfig.replayTargetTimeFunc;
        this._shared.bridgeDemux.register(
            this._contentWindow,
            this._targetOrigin,
            (err, bridge) => {
                if (err) {
                    this._param!.errorHandler(
                        ErrorFactory.createPostMessageError(err),
                    );
                } else {
                    // NOTE: !err のとき、 bridge は Truthy
                    this._bridge = bridge!;
                    this._bridge.on(LoaderMessage.Error, (err) =>
                        this._fireErrorTriggerIfNeeded(err),
                    );
                    this._bridge.on(
                        LoaderMessage.GameCreated,
                        this._handleGameCreated_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.AcquireAMFlow,
                        this._handleAcquireAMFlow_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.PlayOriginDate,
                        this._handlePlayOriginDate_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.ExternalSend,
                        this._handleExternalSend_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.External,
                        this._handleExternalPlugin_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.SkippingChanged,
                        this._handleSkippingChanged_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.GameLoaded,
                        this._handleGameLoaded_bound,
                    );
                    this._bridge.on(
                        LoaderMessage.GameStarted,
                        this._handleGameStarted_bound,
                    );
                    if (this._audioPdiHandler) {
                        this._teardownAudioPdiProxy = setupAudioPdiProxy(
                            this._audioPdiHandler,
                            this._bridge,
                        );
                    }
                    this._start_initializePlaylogClient();
                }
            },
        );
    }

    _start_initializePlaylogClient() {
        if (this._shared.sessionManager.isInitialized()) {
            this._start_request();
        } else {
            const url = findPlaylogClientUrl(this._engineConfig.engine_urls);
            if (url) {
                this._shared.scriptManager.appendScripts(
                    window,
                    [url],
                    (err) => {
                        if (err) {
                            this._param!.errorHandler(
                                ErrorFactory.createHttpRequestError(err),
                            );
                        } else {
                            const client = detectPlaylogClientObject(
                                window,
                                url,
                            );
                            if (client) {
                                this._shared.sessionManager.initialize(client);
                            }
                            this._start_request();
                        }
                    },
                );
            } else {
                this._start_request();
            }
        }
    }

    _start_request() {
        // NOTE: _param, _bridge は start() で代入済み
        this._bridge!.request(
            LoaderMessage.Start,
            {
                engineConfig: this._engineConfig,
                replayData: this._param!.replayData,
                contentUrl: this._param!.contentUrl,
                initialEvents: this._param!.initialEvents,
                argument: this._param!.argument,
                pause: this._isPaused,
                player: this._param!.player,
                playConfig: {
                    ...this._param!.playConfig,
                    replayTargetTimeFunc: undefined,
                },
                proxyAudio: !!this._audioPdiHandler,
                externalPluginSignature: this._param!.externalPluginSignature,
            },
            (err) => this._fireErrorTriggerIfNeeded(err),
        );
    }

    pauseGame() {
        if (!this._isPaused) {
            this._isPaused = true;
            // NOTE: _bridge は start() で代入済み
            this._bridge!.send(LoaderMessage.PauseGame, undefined);
            this._updateTargetTimeNotifier();
        }
    }

    resumeGame() {
        if (this._isPaused) {
            this._isPaused = false;
            // NOTE: _bridge は start() で代入済み
            this._bridge!.send(LoaderMessage.ResumeGame, undefined);
            this._updateTargetTimeNotifier();
        }
    }

    isPaused() {
        return this._isPaused;
    }

    stopGame() {
        if (this._bridge) {
            this._bridge.send(LoaderMessage.StopGame, null);
            if (this._teardownAudioPdiProxy) {
                this._teardownAudioPdiProxy();
            }
            this._releaseAMFlow();
            this._bridge.destroy();
            this._bridge = null;
            // NOTE: 初期値は undefined
            this._externalPluginCaller = null!;
            this._handleSessionManagerError_bound = null!;
            this._handleGameCreated_bound = null!;
            this._handleAcquireAMFlow_bound = null!;
            this._handlePlayOriginDate_bound = null!;
            this._handleExternalSend_bound = null!;
            this._handleExternalPlugin_bound = null!;
            this._handleSkippingChanged_bound = null!;
            this._handleGameLoaded_bound = null!;
            this._handleGameStarted_bound = null!;
            this._notifyTargetTime_bound = null!;
            this._updateTargetTimeNotifier();
            // NOTE: _param は start() で代入済み
            this._param!.gameFinishedHandler();
        }
    }

    sendEvents(list: Event[]) {
        // NOTE: _bridge は start() で代入済み
        this._bridge!.send(LoaderMessage.SendEvents, list);
    }

    dumpPlaylog() {
        return null;
    }

    getGameVars(propName: string, listener: (value: unknown) => void) {
        // NOTE: _bridge は start() で代入済み
        this._bridge!.request(
            LoaderMessage.GetGameVars,
            propName,
            (err, data) => {
                if (!this._fireErrorTriggerIfNeeded(err)) {
                    try {
                        listener(data);
                    } catch (err) {
                        // NOTE: _param は start() で代入済み
                        this._param!.errorHandler(err as Error);
                    }
                }
            },
        );
    }

    setExecutionMode(executionMode: number) {
        if (this._agvExecutionMode !== executionMode) {
            this._agvExecutionMode = executionMode;
            // NOTE: _bridge は start() で代入済み
            this._bridge!.send(LoaderMessage.SetExecutionMode, executionMode);
            this._updateTargetTimeNotifier();
        }
    }

    getExecutionMode() {
        // NOTE: _param は start() で代入済み
        return this._agvExecutionMode ?? this._param!.playConfig.executionMode;
    }

    setReplayTargetTimeFunc(replayTargetTimeFunc: () => number) {
        this._replayTargetTimeFunc = replayTargetTimeFunc;
        this._updateTargetTimeNotifier();
    }

    getReplayTargetTimeFunc() {
        return this._replayTargetTimeFunc ?? null;
    }

    setReplayOriginDate(replayOriginDate: number) {
        this._replayOriginDate = replayOriginDate;
        // NOTE: _bridge は start() で代入済み
        this._bridge!.send(LoaderMessage.SetReplayOriginDate, replayOriginDate);
    }

    getReplayOriginDate() {
        return this._replayOriginDate;
    }

    getPlayOriginDate() {
        return this._playOriginDate;
    }

    resetPrimarySurface(width: number, height: number) {
        // NOTE: _bridge は start() で代入済み
        this._bridge!.send(LoaderMessage.ResetSurface, {
            width,
            height,
        });
    }

    setScale(xScale: number, yScale: number) {
        // NOTE: _bridge は start() で代入済み
        this._bridge!.send(LoaderMessage.SetScale, {
            xScale,
            yScale,
        });
    }

    setMasterVolume(masterVolume: number) {
        if (this._masterVolume !== masterVolume) {
            this._masterVolume = masterVolume;
            // NOTE: _bridge は start() で代入済み
            this._bridge!.send(LoaderMessage.SetMasterVolume, masterVolume);
        }
    }

    getMasterVolume() {
        return this._masterVolume;
    }

    setTabIndex(tabIndex: string) {
        this._bridge!.send(LoaderMessage.SetTabIndex, tabIndex);
    }

    _fireErrorTriggerIfNeeded(err: unknown) {
        if (!err || "string" != typeof err) {
            return false;
        }
        // NOTE: _param は start() で代入済み
        this._param!.errorHandler(ErrorFactory.createGameDriverError(err));
        return true;
    }

    _handleSessionManagerError(err: Error) {
        // NOTE: _param は start() で代入済み
        this._param!.errorHandler(ErrorFactory.createPlaylogError(err));
    }

    _releaseAMFlow() {
        if (this._teardownAMFlowProxy) {
            this._teardownAMFlowProxy();
        }
        if (!this._usingCustomAmflow) {
            // NOTE: _param は start() で代入済み
            this._shared.sessionManager.removeErrorHandler(
                this._param!.playConfig.playlogServerUrl,
                this._handleSessionManagerError_bound,
            );
            this._shared.sessionManager.releaseSession(
                this._param!.playConfig.playlogServerUrl,
            );
        }
    }

    _handleGameCreated(data: unknown) {
        this.game = new GameProxy({
            ...data!,
            playId: this._param!.playConfig.playId,
        } as GameProxyParameterObject);
        // NOTE: _param は start() で代入済み
        if (this._param!.externalPluginSignature) {
            this._externalPluginCaller = new ExternalPluginSignatureCaller(
                this._param!.externalPluginSignature,
                this.game.external,
            );
        }
        this._updateTargetTimeNotifier();
    }

    _handleAcquireAMFlow(
        data: unknown,
        cb: RawMessageEventDataCallback | undefined,
    ) {
        // NOTE: _param は start() で代入済み
        const onError = (err: Error) => {
            this._param!.errorHandler(err);
            if (cb) {
                cb(err.message, undefined);
            }
        };
        const onCreate = (client: AMFlow) => {
            this._amflowClient = client;
            // NOTE: _bridge は start() で代入済み
            this._teardownAMFlowProxy = setupAMFlowProxy(
                this._amflowClient,
                this._bridge!,
            );
            if (cb) {
                cb(null, undefined);
            }
        };
        if (this._customizer?.createCustomAmflowClient) {
            onCreate(this._customizer.createCustomAmflowClient());
            return;
        }
        const conf = this._param!.playConfig;
        this._shared.sessionManager.getSession(
            conf.playlogServerUrl,
            conf.protocol ?? ProtocolType.WebSocket,
            { playId: conf.playId, token: conf.playToken },
            (err, session, usePrimaryChannel) => {
                if (err) {
                    onError(err);
                } else {
                    this._shared.sessionManager.addErrorHandler(
                        conf.playlogServerUrl,
                        this._handleSessionManagerError_bound,
                    );
                    session!.createClient(
                        {
                            usePrimaryChannel,
                        },
                        (err, client) => {
                            if (err) {
                                onError(err);
                            } else {
                                onCreate(client!);
                            }
                        },
                    );
                }
            },
        );
    }

    _handlePlayOriginDate(playOriginDate: unknown) {
        if (typeof playOriginDate == "number") {
            this._playOriginDate = playOriginDate;
        }
    }

    _handleExternalSend(ev: unknown) {
        if (this.game?.external?.send) {
            this.game.external.send(ev);
        }
    }

    _handleExternalPlugin(
        data: unknown,
        cb: RawMessageEventDataCallback | undefined,
    ) {
        const ev: { identifer: string; args: TrustedFunctionArguments } =
            data as any;
        if (this._externalPluginCaller) {
            if (this.game?.external) {
                this._externalPluginCaller.call(ev.identifer, ev.args, cb);
            }
        }
    }

    _handleSkippingChanged(data: unknown) {
        this.game?.skippingChangedTrigger.fire(data as boolean);
    }

    _handleGameLoaded() {
        this.game?._loaded.fire();
    }

    _handleGameStarted() {
        this.game?._started.fire();
    }

    _updateTargetTimeNotifier() {
        if (
            this.game &&
            this._agvExecutionMode !== ExecutionMode.Active &&
            !this._isPaused &&
            this._replayTargetTimeFunc &&
            this._bridge
        ) {
            if (!this._targetTimeNotifierTimer) {
                this._targetTimeNotifierTimer = setInterval(
                    this._notifyTargetTime_bound,
                    this.game.fps,
                );
            }
        } else {
            if (this._targetTimeNotifierTimer) {
                clearInterval(this._targetTimeNotifierTimer);
                this._targetTimeNotifierTimer = null!;
            }
        }
    }

    _notifyTargetTime() {
        if (this._replayTargetTimeFunc) {
            // NOTE: _bridge は start() で代入済み
            this._bridge!.send(
                LoaderMessage.TargetTime,
                this._replayTargetTimeFunc(),
            );
        }
    }
}
