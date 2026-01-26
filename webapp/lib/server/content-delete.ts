"use server";

import { prisma } from "@yasshi2525/persist-schema";
import { DeleteGameResponse } from "../types";
import { deleteContentDir } from "./content-utils";
import { endPlay } from "./play-end";

interface DeleteGameForm {
    gameId: number;
    publisherId: string;
}

async function validateParam(
    param: DeleteGameForm,
): Promise<{ contentIds: number[] } | DeleteGameResponse> {
    if (!param.gameId || !param.publisherId) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    try {
        const game = await prisma.game.findUnique({
            where: {
                id: param.gameId,
            },
            select: {
                publisherId: true,
                versions: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (!game) {
            return {
                ok: false,
                reason: "NotFound",
            };
        }
        if (game.publisherId !== param.publisherId) {
            return {
                ok: false,
                reason: "InvalidParams",
            };
        }
        return {
            contentIds: game.versions.map(({ id }) => id),
        };
    } catch (err) {
        console.warn(
            `failed to delete game (publisherId = "${param.publisherId}", gameId = "${param.gameId}")`,
            err,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}

async function endCurrentPlays(contentIds: number[]) {
    if (contentIds.length === 0) {
        return;
    }
    const playIds = await prisma.play.findMany({
        where: {
            contentId: {
                in: contentIds,
            },
        },
        select: {
            id: true,
        },
    });
    await Promise.all(
        playIds.map(async ({ id }) => {
            await endPlay({ playId: id.toString(), reason: "DEL_CONTENT" });
        }),
    );
}

export async function deleteGame(
    param: DeleteGameForm,
): Promise<DeleteGameResponse> {
    const validation = await validateParam(param);
    if ("ok" in validation) {
        return validation;
    }
    try {
        const { contentIds } = validation;
        await endCurrentPlays(contentIds);
        await prisma.game.delete({
            where: {
                id: param.gameId,
            },
        });
        await Promise.all(
            contentIds.map(async (contentId) => {
                await deleteContentDir(contentId);
            }),
        );
        return {
            ok: true,
        };
    } catch (err) {
        console.warn(`failed to delete game (gameId = "${param.gameId}")`, err);
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}
