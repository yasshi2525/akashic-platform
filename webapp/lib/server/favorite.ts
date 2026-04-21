"use server";

import { prisma } from "@yasshi2525/persist-schema";
import { isWriteBlocked } from "./drain-state";

const favoriteToggleErrReasons = [
    "AlreadyExists",
    "NotFound",
    "InternalError",
    "Drain",
] as const;
type FavoriteToggleErrorType = (typeof favoriteToggleErrReasons)[number];

type FavoriteToggleResponse =
    | { ok: true }
    | { ok: false; reason: FavoriteToggleErrorType };

export async function addFavorite({
    userId,
    gameId,
}: {
    userId: string;
    gameId: number;
}): Promise<FavoriteToggleResponse> {
    if (isWriteBlocked()) {
        return {
            ok: false,
            reason: "Drain",
        };
    }
    try {
        const existing = await prisma.favorite.findUnique({
            where: {
                userId_gameId: {
                    userId,
                    gameId,
                },
            },
            select: { id: true },
        });
        if (existing) {
            return {
                ok: false,
                reason: "AlreadyExists",
            };
        }
        await prisma.favorite.create({
            data: {
                userId,
                gameId,
            },
        });
        return {
            ok: true,
        };
    } catch (err) {
        console.warn(
            `failed to add favorite (userId = ${userId}, gameId = ${gameId})`,
            err,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}

export async function deleteFavorite({
    userId,
    gameId,
}: {
    userId: string;
    gameId: number;
}): Promise<FavoriteToggleResponse> {
    if (isWriteBlocked()) {
        return {
            ok: false,
            reason: "Drain",
        };
    }
    try {
        const deleted = await prisma.favorite.delete({
            where: {
                userId_gameId: {
                    userId,
                    gameId,
                },
            },
        });
        if (!deleted) {
            return {
                ok: false,
                reason: "NotFound",
            };
        }
        return {
            ok: true,
        };
    } catch (err) {
        console.warn(
            `failed to delete favorite (userId = ${userId}, gameId = ${gameId})`,
            err,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}
