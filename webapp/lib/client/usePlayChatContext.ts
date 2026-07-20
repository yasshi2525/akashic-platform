import { useContext } from "react";
import { PlayChatContext } from "./play-chat-context";

export function usePlayChatContext() {
    const ctx = useContext(PlayChatContext);
    if (!ctx) {
        throw new Error(
            "usePlayChatContext must be used within PlayChatProvider",
        );
    }
    return ctx;
}
