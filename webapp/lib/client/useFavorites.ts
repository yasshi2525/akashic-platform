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
    const { isLoading, data, mutate } = useSWR("/api/favorites", fetcher);

    async function add(gameId: number): Promise<boolean> {
        const res = await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId }),
        });
        if (res.ok) {
            await mutate();
            return true;
        }
        return false;
    }

    async function remove(gameId: number): Promise<boolean> {
        const res = await fetch(`/api/favorites/${gameId}`, {
            method: "DELETE",
        });
        if (res.ok) {
            await mutate();
            return true;
        }
        return false;
    }

    const favoriteGameIds = new Set((data ?? []).map((g) => g.id));

    return {
        isLoading,
        favorites: data ?? [],
        favoriteGameIds,
        add,
        remove,
    };
}
