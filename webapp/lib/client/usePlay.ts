import useSWR from "swr";
import { PlayResponse } from "../types";
import { useAuth } from "./useAuth";

const fetcher = async (url: string) => {
    const res = (await (await fetch(url)).json()) as PlayResponse;
    if (!res.ok) {
        switch (res.reason) {
            case "InvalidParams":
                throw new Error(
                    "内部エラーが発生しました。トップページから部屋に入り直してください。",
                );
            case "ClosedPlay":
                throw new Error(
                    "この部屋は存在しないか、すでに終了しています。",
                );
            case "InvalidJoinWord": {
                const err = new Error("入室の言葉が正しくありません。");
                err.name = res.reason;
                throw err;
            }
            case "JoinWordRequired": {
                const err = new Error("入室の言葉を入力してください。");
                err.name = res.reason;
                throw err;
            }
            case "InternalError":
            default:
                throw new Error(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
        }
    }
    return res.data;
};

const requiresJoinWork = (err?: Error) =>
    err?.name === "InvalidJoinWord" || err?.name === "JoinWordRequired";

export function usePlay(
    playId: string,
    inviteHash?: string,
    joinWord?: string,
) {
    const [user] = useAuth();
    const query = new URLSearchParams();
    if (inviteHash) {
        query.set("inviteHash", inviteHash);
    }
    if (joinWord) {
        query.set("joinWord", joinWord);
    }
    const { isLoading, data, error } = useSWR(
        `/api/play/${playId}?${query.toString()}`,
        fetcher,
    );
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
        requiresJoinWork: requiresJoinWork(error),
        error: error ? error.message : undefined,
    };
}
