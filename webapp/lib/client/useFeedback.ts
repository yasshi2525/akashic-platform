import useSWR from "swr";
import { FeedbackResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as FeedbackResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "不正なパラメーターです。ページを更新してください。",
                );
            case "NotFound":
                throw new Error("対象のゲームが見つかりませんでした。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useFeedback(gameId: string) {
    const { isLoading, data, error, mutate } = useSWR(
        gameId ? `/api/feedback/${gameId}` : null,
        fetcher,
    );
    return {
        isLoading,
        list: data,
        error: error ? error.message : undefined,
        mutate,
    };
}
