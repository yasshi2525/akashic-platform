import useSWRInfinite from "swr/infinite";
import { GameInfo, GAMELIST_LIMITS } from "../types";

const fetcher = async (url: string) =>
    (await (await fetch(url)).json()).data as GameInfo[];

export function useGameList(keyword: string | undefined, userId?: string) {
    function getKey(page: number, previousData: GameInfo[]) {
        if (previousData && !previousData.length) {
            return null;
        }
        const query = new URLSearchParams({ page: page.toString() });
        if (keyword) {
            query.set("keyword", keyword);
        }
        if (userId) {
            query.set("userId", userId);
        }
        return `/api/contents?${query.toString()}`;
    }
    const { isLoading, data, size, setSize } = useSWRInfinite(getKey, fetcher);
    const isEmpty = data?.[0].length === 0;
    const isEnd = !!data && data[data.length - 1].length < GAMELIST_LIMITS;

    return {
        isLoading,
        list: data,
        page: size,
        setPage: setSize,
        isEmpty,
        isEnd,
    };
}
