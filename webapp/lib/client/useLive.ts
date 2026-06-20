import useSWR from "swr";
import { LiveResponse } from "../types";
import { useAuth } from "./useAuth";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as LiveResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "NotFound":
                throw new Error("指定されたユーザー部屋は存在しません。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useLive(
    handle: string,
    joinWord: string | undefined,
    polling: boolean = false,
) {
    const [user] = useAuth();
    const query = new URLSearchParams();
    if (joinWord) {
        query.set("joinWord", joinWord);
    }
    const { isLoading, data, error } = useSWR(
        `/api/live/${handle}?${query.toString()}`,
        fetcher,
        {
            refreshInterval: polling ? 10000 : 0,
        },
    );

    return {
        isLoading,
        data: data
            ? {
                  ...data,
                  isGameMaster: !!user && user.id === data.owner.userId,
              }
            : undefined,
        error: error ? error.message : undefined,
    };
}
