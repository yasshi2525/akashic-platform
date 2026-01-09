import type { GameMainParameterObject, Player } from "@akashic/akashic-engine";
import type { StartPoint } from "@akashic/amflow";
import type { Game, GameDriver } from "@akashic/game-driver";
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
     * @default ProtocolType.WebSocket
     */
    protocol?: number;
    /**
     * {@link ExecutionMode}
     */
    executionMode: number;
    playlogServerUrl: string;
    replayData?: ReplayData;
    replayTargetTimeFunc?: () => number;
    replayOriginDate?: number;
}

export interface GameLoaderStartParameterObject {
    pause: boolean;
    player: Player;
    playConfig: PlayConfig;
    replayData: ReplayData | undefined;
    initialEvents: Event[] | undefined;
    argument: GameMainParameterObject["args"];
    contentUrl: string;
    parentHtmlElement: HTMLDivElement;
    externalPluginSignature: FunctionTableObjectMetadata;
    errorHandler: (err: Error) => void;
    gameCreatedHandler: (game: Game) => void;
    gameFinishedHandler: () => void;
}

export interface GameLoader {
    game: Game | null;
    driver: GameDriver | null;
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
