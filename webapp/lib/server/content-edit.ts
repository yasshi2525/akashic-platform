"use server";

import fs from "node:fs";
import { prisma } from "@yasshi2525/persist-schema";
import { ContentErrorResponse, ContentResponse } from "../types";
import {
    createContentRecord,
    deleteContentRecord,
    extractGameFile,
    deployGameZip,
    GameForm,
    toContentDir,
    toIconPath,
    validateGameZip,
    deployIconFile,
    toIconAbsPath,
    deleteContentDir,
    throwIfInvalidContentDir,
} from "./content-utils";
import { endPlay } from "./play-end";

interface EditGameForm extends Partial<GameForm> {
    gameId: number;
    contentId: number;
    publisherId: string;
}

async function validateParam({
    gameId,
    contentId,
    publisherId,
}: EditGameForm): Promise<ContentErrorResponse | undefined> {
    if (gameId == null || contentId == null || !publisherId) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    try {
        const game = await prisma.game.findUniqueOrThrow({
            select: {
                publisherId: true,
            },
            where: {
                id: gameId,
            },
        });
        if (game.publisherId !== publisherId) {
            return {
                ok: false,
                reason: "InvalidParams",
            };
        }
        await prisma.content.findUniqueOrThrow({
            select: {
                id: true,
            },
            where: {
                id: contentId,
            },
        });
    } catch (err) {
        console.warn(
            `failed to register content (pulisherId = "${publisherId}", gameId = "${gameId}")`,
            err,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}

async function updateGameRecord({ gameId, title, description }: EditGameForm) {
    const data:
        | Awaited<Parameters<typeof prisma.game.update>[0]["data"]>
        | undefined =
        title && description
            ? {
                  title,
                  description,
              }
            : title
              ? {
                    title,
                }
              : description
                ? {
                      description,
                  }
                : undefined;
    if (!data) {
        return;
    }
    await prisma.game.update({
        data,
        where: {
            id: gameId,
        },
    });
}

async function updateContentRecord(contentId: number, iconPath: string) {
    await prisma.content.update({
        data: {
            icon: iconPath,
        },
        where: {
            id: contentId,
        },
    });
}

async function getIconPath(contentId: number) {
    return (
        await prisma.content.findUniqueOrThrow({
            select: {
                icon: true,
            },
            where: {
                id: contentId,
            },
        })
    ).icon;
}

async function copyIconFile(
    oldContentId: number,
    newContentDir: string,
    iconPath: string,
) {
    fs.cpSync(
        toIconAbsPath(
            toContentDir(oldContentId),
            await getIconPath(oldContentId),
        ),
        toIconAbsPath(newContentDir, iconPath),
    );
}

async function endCurrentPlay(contentId: number) {
    const playIds = (
        await prisma.content.findUniqueOrThrow({
            select: {
                plays: {
                    select: {
                        id: true,
                    },
                },
            },
            where: {
                id: contentId,
            },
        })
    ).plays.map(({ id }) => id.toString());
    await Promise.all(
        playIds.map(async (playId) => {
            await endPlay({ playId, reason: "DEL_CONTNET" });
        }),
    );
}

export async function editContent(
    param: EditGameForm,
): Promise<ContentResponse> {
    const validationErrParam = await validateParam(param);
    if (validationErrParam) {
        return validationErrParam;
    }
    try {
        await updateGameRecord(param);
        if (param.gameFile) {
            const gameZip = await extractGameFile(param.gameFile);
            const validationErrGameZip = await validateGameZip(gameZip);
            if (validationErrGameZip) {
                return validationErrGameZip;
            }
            const iconPath = param.iconFile
                ? toIconPath(param.iconFile)
                : await getIconPath(param.contentId);
            const newContentId = await createContentRecord(
                param.gameId,
                iconPath,
            );
            const newContentDir = toContentDir(newContentId);
            try {
                throwIfInvalidContentDir(newContentDir, newContentId);
                await deployGameZip(newContentDir, gameZip);
                if (param.iconFile) {
                    await deployIconFile(
                        newContentDir,
                        iconPath,
                        param.iconFile,
                    );
                } else {
                    await copyIconFile(
                        param.contentId,
                        newContentDir,
                        iconPath,
                    );
                }
                await endCurrentPlay(param.contentId);
                await deleteContentRecord(param.contentId);
                deleteContentDir(toContentDir(param.contentId));
                return {
                    ok: true,
                    contentId: newContentId,
                };
            } catch (err) {
                await deleteContentRecord(newContentId);
                deleteContentDir(newContentDir);
                throw err;
            }
        } else {
            if (param.iconFile) {
                const iconPath = toIconPath(param.iconFile);
                await updateContentRecord(param.contentId, iconPath);
                await deployIconFile(
                    toContentDir(param.contentId),
                    iconPath,
                    param.iconFile,
                );
            }
            return {
                ok: true,
                contentId: param.contentId,
            };
        }
    } catch (err) {
        console.warn(
            `failed to edit content (contentId = "${param.contentId}")`,
            err,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}
