"use client";

import useSWRInfinite from "swr/infinite";
import {
    ContentLogInfo,
    CONTENT_LOGLIST_LIMITS,
    ContentLogListResponse,
} from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as ContentLogListResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "不正なパラメーターです。ページを更新してください。",
                );
            case "Forbidden":
                throw new Error("このページを閲覧する権限がありません");
            case "NotFound":
                throw new Error("対象のゲームが見つかりません。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useContentLogList(gameId: string) {
    function getKey(page: number, previousData: ContentLogInfo[]) {
        if (previousData && !previousData.length) {
            return null;
        }
        const query = new URLSearchParams({ page: page.toString() });
        return `/api/game/${gameId}/logs?${query.toString()}`;
    }
    const { isLoading, data, size, setSize, error } = useSWRInfinite(
        getKey,
        fetcher,
    );
    const isEmpty = data?.[0].length === 0;
    const isEnd =
        !!data && data[data.length - 1].length < CONTENT_LOGLIST_LIMITS;
    return {
        isLoading,
        list: data,
        page: size,
        setPage: setSize,
        isEmpty,
        isEnd,
        error: error?.message,
    };
}
