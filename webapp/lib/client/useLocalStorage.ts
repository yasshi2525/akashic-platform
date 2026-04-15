import { useCallback, useState } from "react";

export const STORAGE_KEYS = {
    ROOM_NAME: "akashic-platform:room:name",
    ROOM_IS_LIMITED: "akashic-platform:room:isLimited",
    ROOM_JOIN_WORD: "akashic-platform:room:joinWord",
    PLAYER_INFO_NAME: "akashic-platform:player-info:name",
    PLAYER_VOLUME: "akashic-platform:player:volume",
    PLAYER_MUTED: "akashic-platform:player:muted",
    PLAYER_PREV_VOLUME: "akashic-platform:player:prevVolume",
} as const;

export function useLocalStorage<T>(key: string, defaultValue: T) {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return defaultValue;
        }
        try {
            const item = localStorage.getItem(key);
            if (item !== null) {
                return JSON.parse(item) as T;
            }
        } catch (err) {
            console.warn(`Failed to read key "${key}" from localStorage:`, err);
        }
        return defaultValue;
    });

    const save = useCallback(
        (next: T, withPersist: boolean = true) => {
            setValue(next);
            if (withPersist) {
                try {
                    localStorage.setItem(key, JSON.stringify(next));
                } catch (err) {
                    console.warn(
                        `Failed to persist value for key "${key}" in localStorage:`,
                        err,
                    );
                }
            }
        },
        [key],
    );

    return [value, save] as const;
}
