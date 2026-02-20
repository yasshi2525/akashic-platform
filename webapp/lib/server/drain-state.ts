type DrainState = {
    enabled: boolean;
    reason?: string;
    updatedAt: number;
    requestIds: Map<string, number>;
};

declare global {
    var __webappDrainState: DrainState | undefined;
}

function getStore(): DrainState {
    if (!globalThis.__webappDrainState) {
        globalThis.__webappDrainState = {
            enabled: false,
            updatedAt: Date.now(),
            requestIds: new Map<string, number>(),
        };
    }
    return globalThis.__webappDrainState;
}

export function getDrainState() {
    const store = getStore();
    return {
        enabled: store.enabled,
        reason: store.reason,
        updatedAt: store.updatedAt,
    };
}

export function setDrainState({
    enabled,
    reason,
}: {
    enabled: boolean;
    reason?: string;
}) {
    const store = getStore();
    store.enabled = enabled;
    store.reason = reason;
    store.updatedAt = Date.now();
}

export function isWriteBlocked() {
    return getStore().enabled;
}

export function registerRequestId({
    requestId,
    nowMs,
    ttlMs,
}: {
    requestId: string;
    nowMs: number;
    ttlMs: number;
}) {
    const store = getStore();
    for (const [id, expiresAt] of store.requestIds) {
        if (expiresAt <= nowMs) {
            store.requestIds.delete(id);
        }
    }
    const exists = store.requestIds.get(requestId);
    if (exists && exists > nowMs) {
        return false;
    }
    store.requestIds.set(requestId, nowMs + ttlMs);
    return true;
}
