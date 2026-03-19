import useSWR from "swr";
import { ContentLogInfo, CONTENT_LOG_LIMITS } from "../types";

interface GamePlaysResponse {
    ok: true;
    data: ContentLogInfo[];
    total: number;
}

const fetcher = async (url: string): Promise<GamePlaysResponse> => {
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) {
        throw new Error("このページにはアクセスできません。");
    }
    if (res.status === 404) {
        throw new Error("ゲームが見つかりませんでした。");
    }
    if (!res.ok) {
        throw new Error(
            "予期しないエラーが発生しました。時間をおいてリトライしてください。",
        );
    }
    return res.json() as Promise<GamePlaysResponse>;
};

export function useGamePlays(
    gameId: string,
    page: number = 0,
    limits: number = CONTENT_LOG_LIMITS,
) {
    const { isLoading, data, error } = useSWR(
        `/api/game/${gameId}/plays?page=${page}&limits=${limits}`,
        fetcher,
    );
    return {
        isLoading,
        plays: data?.data ?? [],
        total: data?.total ?? 0,
        error: error ? (error as Error).message : undefined,
    };
}
