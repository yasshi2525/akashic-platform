import useSWR from "swr";
import { UserProfileResponse } from "../types";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as UserProfileResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error("不正なパラメーターです。");
            case "NotFound":
                throw new Error("ユーザーが見つかりませんでした。");
            default:
                throw new Error("読み込みに失敗しました。");
        }
    }
    return res.data;
};

export function useUserProfile(userId?: string) {
    const { isLoading, data, error, mutate } = useSWR(
        userId ? `/api/user/${userId}` : null,
        fetcher,
    );
    return {
        isLoading,
        profile: data,
        error: error ? error.message : undefined,
        mutate,
    };
}
