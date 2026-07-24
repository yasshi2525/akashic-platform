"use client";

import { useCallback, useEffect, useState } from "react";
import {
    LocalMuteEntry,
    MUTE_LABEL_BODY_MAX,
    MUTE_LIMIT_DEFAULT,
} from "../types";
import { STORAGE_KEYS } from "./useLocalStorage";

/**
 * 未サインイン利用者のミュート。サーバーに保存できないため端末内に持つ。
 * 対象は匿名キーで指す。匿名キーは同じ閲覧者から見れば掲示板・部屋をまたいで
 * 同じ値になるので、部屋が変わってもミュートを引き継げる。
 */
function read(): LocalMuteEntry[] {
    if (typeof window === "undefined") {
        return [];
    }
    try {
        const item = localStorage.getItem(STORAGE_KEYS.LOCAL_MUTES);
        if (!item) {
            return [];
        }
        const parsed = JSON.parse(item);
        return Array.isArray(parsed) ? (parsed as LocalMuteEntry[]) : [];
    } catch (err) {
        console.warn("failed to read local mutes", err);
        return [];
    }
}

function write(entries: LocalMuteEntry[]) {
    try {
        localStorage.setItem(STORAGE_KEYS.LOCAL_MUTES, JSON.stringify(entries));
    } catch (err) {
        console.warn("failed to persist local mutes", err);
    }
}

// 掲示板と部屋チャットが同時に表示されうるため、
// 片方での操作をもう片方へ即座に伝える
const listeners = new Set<(entries: LocalMuteEntry[]) => void>();

function publish(entries: LocalMuteEntry[]) {
    write(entries);
    for (const listener of listeners) {
        listener(entries);
    }
}

export function useLocalMutes() {
    const [entries, setEntries] = useState<LocalMuteEntry[]>([]);

    // localStorage はサーバーで読めないため、初期値は必ずマウント後に反映する
    useEffect(() => {
        setEntries(read());
        listeners.add(setEntries);
        return () => {
            listeners.delete(setEntries);
        };
    }, []);

    const isMuted = useCallback(
        (anonKey: string | undefined) =>
            !!anonKey && entries.some((entry) => entry.anonKey === anonKey),
        [entries],
    );

    const add = useCallback((anonKey: string, label: string) => {
        const current = read();
        if (
            current.length >= MUTE_LIMIT_DEFAULT ||
            current.some((entry) => entry.anonKey === anonKey)
        ) {
            return false;
        }
        publish([
            ...current,
            {
                anonKey,
                label: label.slice(0, MUTE_LABEL_BODY_MAX * 2),
                createdAt: Date.now(),
            },
        ]);
        return true;
    }, []);

    const remove = useCallback((anonKey: string) => {
        publish(read().filter((entry) => entry.anonKey !== anonKey));
    }, []);

    return { entries, isMuted, add, remove } as const;
}
