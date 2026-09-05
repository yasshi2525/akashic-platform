import useSWR from "swr";
import { BansGetResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as BansGetResponse;
    if (!res.ok) {
        if (res.reason === "Unauthorized") {
            return [];
        }
        throw new Error(
            "予期しないエラーが発生しました。時間をおいてリトライしてください。",
        );
    }
    return res.data;
};

export function useBans(enabled: boolean) {
    const { isLoading, data, error, mutate } = useSWR(
        enabled ? "/api/bans" : null,
        fetcher,
    );
    return {
        isLoading,
        list: data,
        error: error ? (error as Error).message : undefined,
        mutate,
    };
}
