import type {
    GameMainParameterObject,
    Player,
    Trigger,
} from "@akashic/akashic-engine";
import type { StartPoint } from "@akashic/amflow";
import type { Game } from "@akashic/game-driver";
import type { TickList, Event } from "@akashic/playlog";
import type { ExecutionMode } from "./akashic-gameview";
import { FunctionTableObjectMetadata } from "./ExternalPluginSignatureCaller";

export interface ReplayData {
    tickList: TickList;
    startPoints: StartPoint[] | undefined;
}

export interface DumpData {
    tickList: TickList | null;
    startPoints: StartPoint[];
}

export interface PlayConfig {
    playId: string;
    playToken: string;
    /**
     * {@link ProtocolType}
     */
    protocol: number | null;
    /**
     * {@link ExecutionMode}
     */
    executionMode: number;
    playlogServerUrl: string;
    replayData: ReplayData | null;
    replayTargetTimeFunc: (() => number) | undefined;
    replayOriginDate: number | undefined;
}

export interface MinimalGame {
    width: number;
    height: number;
    abortTrigger?: Trigger<void>;
    _setMuted(isMuted: boolean): void;
}

export interface MinimalGameDriver {}

export interface GameLoaderStartParameterObject {
    pause: boolean;
    player: Player;
    playConfig: PlayConfig;
    replayData: ReplayData | null;
    initialEvents: Event[] | null;
    argument: GameMainParameterObject["args"];
    contentUrl: string;
    parentHtmlElement: HTMLDivElement;
    externalPluginSignature: FunctionTableObjectMetadata;
    errorHandler: (err: Error) => void;
    gameCreatedHandler: (game: Game) => void;
    gameFinishedHandler: () => void;
}

export interface GameLoader {
    game: MinimalGame | null;
    driver: MinimalGameDriver | null;
    fps: number;
    resizablePrimarySurface: boolean;
    start(param: GameLoaderStartParameterObject): void;
    pauseGame(): void;
    resumeGame(): void;
    stopGame(): void;
    isPaused(): boolean;
    sendEvents(events: Event[]): void;
    dumpPlaylog(): DumpData | null;
    /**
     * @param executionMode {@link ExecutionMode}
     */
    setExecutionMode(executionMode: number): void;
    /**
     * @returns executionMode {@link ExecutionMode}
     */
    getExecutionMode(): number;
    setReplayTargetTimeFunc(replayTargetTimeFunc: () => number): void;
    getReplayTargetTimeFunc(): (() => number) | null;
    getPlayOriginDate(): number | null;
    setReplayOriginDate(replayOriginDate: number): void;
    getReplayOriginDate(): number | null;
    getGameVars(propName: string, listener: (value: unknown) => void): void;
    setScale(xScale: number, yScale: number): void;
    setTabIndex(tabIndex: string): void;
    resetPrimarySurface(width: number, height: number): void;
    setMasterVolume(masterVolume: number): void;
    getMasterVolume(): number;
}
