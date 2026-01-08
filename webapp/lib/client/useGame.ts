import useSWR from "swr";
import { GameResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as GameResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "内部エラーが発生しました。一度戻ってリトライしてください。",
                );
            case "NotFound":
                throw new Error("ゲームが見つかりませんでした。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useGame(id: string) {
    const { isLoading, data, error } = useSWR(`/api/game/${id}`, fetcher);
    return {
        isLoading,
        gameInfo: data,
        error: error ? error.message : undefined,
    };
}
