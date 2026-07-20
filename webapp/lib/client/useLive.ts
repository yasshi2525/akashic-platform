import useSWR from "swr";
import { LiveResponse } from "../types";
import { useAuth } from "./useAuth";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as LiveResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "NotFound":
                throw new Error("指定されたユーザーの部屋は存在しません。");
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
    // ゲスト cookie の発行前に問い合わせると、入室者を特定できずアクセス権
    // (部屋チャット用の Cookie) が発行されないため、認証確定まで待つ
    const { isLoading, data, error, mutate } = useSWR(
        user ? `/api/live/${handle}/?${query.toString()}` : null,
        fetcher,
        {
            refreshInterval: polling ? 4000 : 0,
        },
    );

    return {
        isLoading: isLoading || !user,
        data: data
            ? {
                  ...data,
                  isGameMaster: !!user && user.id === data.owner.userId,
              }
            : undefined,
        error: error ? error.message : undefined,
        mutate,
    };
}
