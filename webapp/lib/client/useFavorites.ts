import useSWR from "swr";
import { FavoriteListResponse, GameInfo } from "../types";

const fetcher = async (url: string): Promise<GameInfo[]> => {
    const res = (await (await fetch(url)).json()) as FavoriteListResponse;
    if (!res.ok) {
        throw new Error("お気に入りの取得に失敗しました。");
    }
    return res.data;
};

export function useFavorites() {
    const { isLoading, data } = useSWR("/api/favorites", fetcher);
    const favoriteGameIds = new Set((data ?? []).map((g) => g.id));
    return {
        isLoading,
        favorites: data ?? [],
        favoriteGameIds,
    };
}
