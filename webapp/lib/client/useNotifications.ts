import useSWR from "swr";
import { NotificationResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as NotificationResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "NotAuthorized":
                throw new Error("通知の取得にはサインインが必要です。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useNotifications(isEnabled: boolean) {
    const { isLoading, data, error, mutate } = useSWR(
        isEnabled ? `/api/notifications` : null,
        fetcher,
    );

    return {
        isLoading,
        list: data,
        error: error ? error.message : undefined,
        mutate,
    };
}
