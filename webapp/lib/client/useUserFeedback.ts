import useSWRInfinite from "swr/infinite";
import { FEEDBACK_LIMITS, UserFeedbackResponse } from "../types";

type FeedbackType = "received" | "posted";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as UserFeedbackResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "不正なパラメーターです。ページを更新してください。",
                );
            case "NotFound":
                throw new Error("対象のユーザーが見つかりませんでした。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useUserFeedback(userId: string, type: FeedbackType) {
    function getKey(
        page: number,
        previousData: Awaited<ReturnType<typeof fetcher>>,
    ) {
        if (previousData && !previousData.length) {
            return null;
        }
        const query = new URLSearchParams({
            page: page.toString(),
            type,
            limits: FEEDBACK_LIMITS.toString(),
        });
        return `/api/user/${userId}/feedback?${query.toString()}`;
    }
    const { isLoading, data, error, size, setSize, mutate } = useSWRInfinite(
        getKey,
        fetcher,
    );

    const isEmpty = data?.[0].length === 0;
    const isEnd = !!data && data[data.length - 1].length < FEEDBACK_LIMITS;

    return {
        isLoading,
        list: data,
        error: error ? error.message : undefined,
        page: size,
        setPage: setSize,
        isEmpty,
        isEnd,
        mutate,
    };
}
