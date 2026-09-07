import { createContext } from "react";
import { PlayChatMessageInfo } from "../types";

export const PlayChatContext = createContext<{
    playId: string;
    isGameMaster: boolean;
    fullscreen: boolean;
    playerName: string;
    setPlayerName: (name: string) => void;
    messages: PlayChatMessageInfo[];
    incoming: PlayChatMessageInfo[];
    consumeIncoming: (upTo: number) => void;
    isLoading: boolean;
    error?: string;
    refresh: () => Promise<void>;
} | null>(null);
