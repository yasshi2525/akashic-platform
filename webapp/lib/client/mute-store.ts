"use client";

import { useSyncExternalStore } from "react";

/**
 * ミュート状態のクライアント側上書き。
 *
 * 部屋チャットはカーソルで差分取得するため、取得済みメッセージの muted は
 * サーバーが後から訂正できない。ミュートした直後に画面へ反映するには、
 * クライアント側で匿名キー単位の上書きを持つ必要がある。
 * 解除も同様なので、真偽値を保持して両方向を扱う。
 */
const overrides = new Map<string, boolean>();
const listeners = new Set<() => void>();

// useSyncExternalStore は参照の同一性で変化を判定するため、版数を返す
let version = 0;

function emit() {
    version += 1;
    for (const listener of listeners) {
        listener();
    }
}

export function setMuteOverride(anonKey: string, muted: boolean) {
    overrides.set(anonKey, muted);
    emit();
}

export function getMuteOverride(anonKey: string | undefined) {
    return anonKey == null ? undefined : overrides.get(anonKey);
}

export function clearMuteOverrides() {
    overrides.clear();
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useMuteOverrideVersion() {
    return useSyncExternalStore(
        subscribe,
        () => version,
        () => 0,
    );
}
