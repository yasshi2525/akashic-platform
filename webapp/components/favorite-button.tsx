"use client";

import { useState } from "react";
import {
    Alert,
    CircularProgress,
    IconButton,
    Snackbar,
    Tooltip,
    useTheme,
} from "@mui/material";
import { Favorite, FavoriteBorder } from "@mui/icons-material";
import { addFavorite, deleteFavorite } from "@/lib/server/favorite";

export function FavoriteButton({
    userId,
    gameId,
    isLoading,
    isFavorited,
    size = "medium",
}: {
    userId: string;
    gameId: number;
    isLoading: boolean;
    isFavorited: boolean;
    size?: "small" | "medium" | "large";
}) {
    const theme = useTheme();
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string>();

    async function handleClick(e: React.MouseEvent) {
        e.stopPropagation();
        if (isUpdating) {
            return;
        }
        setIsUpdating(true);
        const res = isFavorited
            ? await deleteFavorite({ userId, gameId })
            : await addFavorite({ userId, gameId });
        if (!res.ok) {
            switch (res.reason) {
                case "AlreadyExists":
                    setError("すでにお気に入りに追加されています。");
                    break;
                case "NotFound":
                    setError(
                        "お気に入りに追加するゲームが見つかりません。画面を更新してください。",
                    );
                    break;
                case "Drain":
                    setError(
                        "現在臨時メンテナンス中のため、お気に入り操作ができません。1時間ほど時間をおいてください。",
                    );
                    break;
                case "InternalError":
                default:
                    setError(
                        "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                    );
                    break;
            }
        }
        setIsUpdating(false);
    }

    if (isLoading) {
        return (
            <CircularProgress
                size={size === "small" ? 16 : size === "large" ? 28 : 22}
            />
        );
    }
    return (
        <>
            <Tooltip
                arrow
                title={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
            >
                <IconButton
                    aria-label={
                        isFavorited ? "お気に入りから削除" : "お気に入りに追加"
                    }
                    onClick={handleClick}
                    disabled={isUpdating}
                    size={size}
                >
                    {isUpdating ? (
                        <CircularProgress
                            size={
                                size === "small"
                                    ? 16
                                    : size === "large"
                                      ? 28
                                      : 22
                            }
                        />
                    ) : isFavorited ? (
                        <Favorite
                            fontSize={size}
                            sx={{ color: theme.palette.primary.light }}
                        />
                    ) : (
                        <FavoriteBorder fontSize={size} />
                    )}
                </IconButton>
            </Tooltip>
            {error && (
                <Snackbar
                    open={!!error}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    autoHideDuration={3000}
                    disableWindowBlurListener={true}
                    slotProps={{
                        clickAwayListener: {
                            onClickAway: (event) => {
                                (event as any).defaultMuiPrevented = true;
                            },
                        },
                    }}
                    onClose={() => setError(undefined)}
                >
                    <Alert severity="error">{error}</Alert>
                </Snackbar>
            )}
        </>
    );
}
