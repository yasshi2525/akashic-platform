"use server";

import { prisma } from "@yasshi2525/persist-schema";
import { isWriteBlocked } from "./drain-state";
import { User } from "../types";

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

export async function isFavorited(
    user: User | null,
    gameId: number,
): Promise<boolean> {
    if (!user || user.authType === "guest") {
        return false;
    }
    try {
        const favorite = await prisma.favorite.findUnique({
            where: {
                userId_gameId: {
                    userId: user.id,
                    gameId,
                },
            },
            select: { id: true },
        });
        return !!favorite;
    } catch (err) {
        console.warn(
            `failed to check favorite (userId = ${user.id}, gameId = ${gameId})`,
            err,
        );
        return false;
    }
}

export async function getFavoriteList(user: User | null, gameIds: number[]) {
    if (!user || user.authType === "guest") {
        return [];
    }
    try {
        const favorites = await prisma.favorite.findMany({
            where: {
                userId: user.id,
                gameId: {
                    in: gameIds,
                },
            },
            select: {
                gameId: true,
            },
        });
        return favorites.map((f) => f.gameId);
    } catch (err) {
        console.warn(`failed to get favorite list (userId = ${user.id})`, err);
        return [];
    }
}

export async function addFavorite(
    userId: string,
    gameId: number,
): Promise<FavoriteToggleResponse> {
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

export async function deleteFavorite(
    userId: string,
    gameId: number,
): Promise<FavoriteToggleResponse> {
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
