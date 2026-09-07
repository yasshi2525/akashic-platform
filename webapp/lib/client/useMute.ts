"use client";

import { useCallback, useState, useTransition } from "react";
import { MessageAuthorInfo } from "../types";
import { muteAuthorAction, unmuteAuthorAction } from "../server/mute-action";
import { useAuth } from "./useAuth";
import { useLocalMutes } from "./useLocalMutes";
import {
    getMuteOverride,
    setMuteOverride,
    useMuteOverrideVersion,
} from "./mute-store";

export type MuteSource = "board" | "chat";

const initialState = { ok: true, submitted: false } as const;

export interface MuteTargetMessage {
    id: number;
    author: MessageAuthorInfo;
    body: string;
    muted?: boolean;
}

/**
 * サインイン利用者はサーバーに、未サインイン利用者は端末内に保存する。
 * 呼び出し側が両者を意識しなくて済むよう、ここで差異を吸収する。
 */
export function useMute(source: MuteSource, onChanged?: () => void) {
    const [user] = useAuth();
    const localMutes = useLocalMutes();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | undefined>();
    useMuteOverrideVersion();

    const isPersisted = user?.authType === "oauth";

    const isMuted = useCallback(
        (message: MuteTargetMessage) => {
            const override = getMuteOverride(message.author.anonKey);
            if (override != null) {
                return override;
            }
            return isPersisted
                ? !!message.muted
                : localMutes.isMuted(message.author.anonKey);
        },
        [isPersisted, localMutes],
    );

    const toggle = useCallback(
        (message: MuteTargetMessage) => {
            setError(undefined);
            const anonKey = message.author.anonKey;
            if (!anonKey) {
                setError("この投稿はミュートできません。");
                return;
            }
            const muted = isMuted(message);

            if (!isPersisted) {
                if (muted) {
                    localMutes.remove(anonKey);
                } else if (
                    !localMutes.add(
                        anonKey,
                        `${message.author.name}: ${message.body}`,
                    )
                ) {
                    setError("ミュートの上限に達しました。");
                    return;
                }
                setMuteOverride(anonKey, !muted);
                onChanged?.();
                return;
            }

            const formData = new FormData();
            formData.set("source", source);
            formData.set("messageId", `${message.id}`);
            startTransition(async () => {
                const state = await (muted
                    ? unmuteAuthorAction(initialState, formData)
                    : muteAuthorAction(initialState, formData));
                if (!state.ok) {
                    setError(state.message);
                    return;
                }
                setMuteOverride(anonKey, !muted);
                onChanged?.();
            });
        },
        [isPersisted, isMuted, localMutes, onChanged, source],
    );

    return {
        isMuted,
        toggle,
        pending,
        error,
        clearError: () => setError(undefined),
        /** 未サインイン時はサインインを促す文言を出し分ける */
        isPersisted,
    } as const;
}
