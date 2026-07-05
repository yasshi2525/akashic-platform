import useSWR from "swr";
import { BoardMessagesGetResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as BoardMessagesGetResponse;
    if (!res.ok) {
        throw new Error(
            "予期しないエラーが発生しました。時間をおいてリトライしてください。",
        );
    }
    return res.data;
};

export function useBoardMessages() {
    const { isLoading, data, error, mutate } = useSWR(
        "/api/board-messages",
        fetcher,
        {
            refreshInterval: 15000,
        },
    );

    return {
        isLoading,
        list: data,
        error: error ? (error as Error).message : undefined,
        mutate,
    };
}
