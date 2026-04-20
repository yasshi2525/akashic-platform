"use client";

import { useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { Favorite, FavoriteBorder } from "@mui/icons-material";

export function FavoriteButton({
    gameId,
    isFavorited,
    onAdd,
    onRemove,
    size = "medium",
}: {
    gameId: number;
    isFavorited: boolean;
    onAdd: (gameId: number) => Promise<boolean>;
    onRemove: (gameId: number) => Promise<boolean>;
    size?: "small" | "medium" | "large";
}) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleClick(e: React.MouseEvent) {
        e.stopPropagation();
        if (isLoading) return;
        setIsLoading(true);
        try {
            if (isFavorited) {
                await onRemove(gameId);
            } else {
                await onAdd(gameId);
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Tooltip arrow title={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}>
            <span>
                <IconButton
                    aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
                    onClick={handleClick}
                    disabled={isLoading}
                    size={size}
                >
                    {isLoading ? (
                        <CircularProgress size={size === "small" ? 16 : size === "large" ? 28 : 22} />
                    ) : isFavorited ? (
                        <Favorite fontSize={size} color="error" />
                    ) : (
                        <FavoriteBorder fontSize={size} />
                    )}
                </IconButton>
            </span>
        </Tooltip>
    );
}
