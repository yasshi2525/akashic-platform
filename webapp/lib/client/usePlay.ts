import useSWR from "swr";
import { PlayResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as PlayResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "内部エラーが発生しました。トップページから部屋に入り直してください。",
                );
            case "ClosedPlay":
                throw new Error(
                    "この部屋は存在しないか、すでに終了しています。",
                );
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return {
        playToken: res.playToken,
        contentId: res.contentId,
    };
};

export function usePlay(playId: string) {
    const { isLoading, data, error } = useSWR(`/api/play/${playId}`, fetcher);
    return {
        isLoading,
        playToken: data?.playToken,
        contentId: data?.contentId,
        error: error ? error.message : undefined,
    };
}
