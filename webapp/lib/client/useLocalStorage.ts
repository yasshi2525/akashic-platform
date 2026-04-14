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

function readFromLocalStorage<T>(key: string, defaultValue: T): T {
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
}

function writeToLocalStorage<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.warn(
            `Failed to persist value for key "${key}" in localStorage:`,
            err,
        );
    }
}

/** onChange のたびに localStorage へ保存する。 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(() =>
        readFromLocalStorage(key, defaultValue),
    );

    const setAndPersist = useCallback(
        (next: T) => {
            setValue(next);
            writeToLocalStorage(key, next);
        },
        [key],
    );

    return [value, setAndPersist];
}

/** localStorage から初期値を読み取るだけで書き込みは行わない。 */
export function useReadLocalStorage<T>(key: string, defaultValue: T): T {
    const [value] = useState<T>(() => readFromLocalStorage(key, defaultValue));
    return value;
}

/**
 * localStorage から初期値を読み取り、setState と persist を別々に提供する。
 * setState は React state のみ更新し、persist は state と localStorage の両方を更新する。
 * 明示的なタイミングでのみ保存したい場合に使用する。
 */
export function useLocalStorageManual<T>(
    key: string,
    defaultValue: T,
): [T, (value: T) => void, (value: T) => void] {
    const [value, setValue] = useState<T>(() =>
        readFromLocalStorage(key, defaultValue),
    );

    const persist = useCallback(
        (next: T) => {
            setValue(next);
            writeToLocalStorage(key, next);
        },
        [key],
    );

    return [value, setValue, persist];
}
