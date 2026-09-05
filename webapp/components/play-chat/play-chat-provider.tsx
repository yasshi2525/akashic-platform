"use client";

import { ReactNode } from "react";
import { PlayChatContext } from "@/lib/client/play-chat-context";
import { usePlayChat } from "@/lib/client/usePlayChat";

export function PlayChatProvider({
    playId,
    isGameMaster,
    enabled,
    fullscreen,
    playerName,
    setPlayerName,
    children,
}: {
    playId: string;
    isGameMaster: boolean;
    enabled: boolean;
    fullscreen: boolean;
    playerName: string;
    setPlayerName: (name: string) => void;
    children: ReactNode;
}) {
    const chat = usePlayChat(playId, enabled);
    return (
        <PlayChatContext
            value={{
                playId,
                isGameMaster,
                fullscreen,
                playerName,
                setPlayerName,
                ...chat,
            }}
        >
            {children}
        </PlayChatContext>
    );
}
