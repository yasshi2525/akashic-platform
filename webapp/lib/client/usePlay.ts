import useSWR from "swr";
import { PlayResponse } from "../types";
import { useAuth } from "./useAuth";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as PlayResponse;
    if (!res.ok) {
        const err = new Error(res.reason);
        err.name = res.reason;
        throw err;
    }
    return res.data;
};

function toErrorMessage(reason: string | undefined) {
    switch (reason) {
        case "InvalidParams":
            return "内部エラーが発生しました。トップページから部屋に入り直してください。";
        case "ClosedPlay":
            return "この部屋は存在しないか、すでに終了しています。";
        case "InternalError":
            return "予期しないエラーが発生しました。時間をおいてリトライしてください。";
        default:
            return undefined;
    }
}

export function usePlay(playId: string, inviteHash?: string, joinWord?: string) {
    const [user] = useAuth();
    const query = new URLSearchParams();
    if (inviteHash) {
        query.set("inviteHash", inviteHash);
    }
    if (joinWord?.trim()) {
        query.set("joinWord", joinWord.trim());
    }
    const endpoint = `/api/play/${playId}${query.toString() ? `?${query.toString()}` : ""}`;
    const { isLoading, data, error } = useSWR(endpoint, fetcher);
    const reason = (error as Error | undefined)?.name;

    return {
        isLoading,
        data: data
            ? {
                  playToken: data.playToken,
                  playName: data.playName,
                  isLimited: data.isLimited,
                  inviteHash: data.inviteHash,
                  gameMaster: data.gameMaster,
                  game: data.game,
                  isGameMaster: !!user && user.id === data.gameMaster.id,
                  contentWidth: data.width,
                  contentHeight: data.height,
                  contentExternal: data.external,
                  createdAt: data.createdAt,
                  remainingMs: data.remainingMs,
                  expiresAt: data.expiresAt,
              }
            : undefined,
        reason:
            reason === "JoinWordRequired" || reason === "InvalidJoinWord"
                ? reason
                : undefined,
        error: toErrorMessage(reason),
    };
}
