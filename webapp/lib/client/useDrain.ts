import useSWR from "swr";

export type DrainStatus = {
    enabled: boolean;
    reason?: string;
    updatedAt: number;
};

type DrainResponse =
    | ({ ok: true } & DrainStatus)
    | { ok: false; reason: string };

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as DrainResponse;
    if (!res.ok) {
        throw new Error("サーバー状態の取得に失敗しました。");
    }
    const state: DrainStatus = {
        enabled: res.enabled,
        updatedAt: res.updatedAt,
    };
    if (res.reason !== undefined) {
        state.reason = res.reason;
    }
    return state;
};

export function useDrain(initialState: DrainStatus) {
    const { data } = useSWR(`/api/internal/drain`, fetcher, {
        fallbackData: initialState,
        refreshInterval: 5000,
    });

    return {
        state: data ?? initialState,
    };
}
