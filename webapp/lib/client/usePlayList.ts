import useSWRInfinite from "swr/infinite";
import { AnonymousPlayInfo, PlayInfo, PLAYLIST_LIMITS } from "../types";

const fetcher = async (url: string) =>
    (await (await fetch(url)).json()).data as PlayInfo[];

const anonymousFetcher = async (url: string) =>
    (await (await fetch(url)).json()).data as AnonymousPlayInfo[];

export function usePlayList(keyword?: string, gameMasterId?: string) {
    function getKey(page: number, previousData: PlayInfo[]) {
        if (previousData && !previousData.length) {
            return null;
        }
        const query = new URLSearchParams({ page: page.toString() });
        if (keyword) {
            query.set("keyword", keyword);
        }
        if (gameMasterId) {
            query.set("gameMasterId", gameMasterId);
        }
        return `/api/plays?${query.toString()}`;
    }
    const { isLoading, data, size, setSize } = useSWRInfinite(getKey, fetcher);
    const isEmpty = data?.[0].length === 0;
    const isEnd = data && data[data.length - 1].length < PLAYLIST_LIMITS;

    return {
        isLoading,
        list: data,
        page: size,
        setPage: setSize,
        isEmpty,
        isEnd,
    };
}

export function useAnonymousPlayList() {
    function getKey(page: number, previousData: AnonymousPlayInfo[]) {
        if (previousData && !previousData.length) {
            return null;
        }
        const query = new URLSearchParams({
            page: page.toString(),
            anonymous: "true",
        });
        return `/api/plays?${query.toString()}`;
    }
    const { isLoading, data, size, setSize } = useSWRInfinite(
        getKey,
        anonymousFetcher,
    );
    const isEmpty = data?.[0].length === 0;
    const isEnd = data && data[data.length - 1].length < PLAYLIST_LIMITS;

    return {
        isLoading,
        list: data,
        page: size,
        setPage: setSize,
        isEmpty,
        isEnd,
    };
}
