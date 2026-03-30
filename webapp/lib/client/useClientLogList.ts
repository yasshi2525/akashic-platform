"use client";

import useSWRMutation from "swr/mutation";
import { ClientLogsGetResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as ClientLogsGetResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "不正なパラメーターです。再読み込みしてください。",
                );
            case "Forbidden":
                throw new Error("このログを閲覧する権限がありません");
            case "NotFound":
                throw new Error("指定された部屋が見つかりませんでした。");
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

export function useClientLogList(contentId: number, playId: number) {
    const { isMutating, data, error, trigger } = useSWRMutation(
        `/api/content/${contentId}/play/${playId}/client-logs`,
        fetcher,
        { populateCache: true },
    );
    return {
        isLoading: isMutating,
        list: data,
        error: error?.message,
        trigger,
    };
}
