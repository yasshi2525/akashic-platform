"use server";

import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@yasshi2525/persist-schema";
import { ContentErrorResponse, ContentResponse } from "../types";
import {
    createContentRecord,
    deleteContentRecord,
    extractGameFile,
    deployGameZip,
    GameForm,
    toIconPath,
    validateGameZip,
    deployIconFile,
    deleteContentDir,
    throwIfInvalidContentDir,
    getBucket,
    getS3Client,
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

async function updateGameRecord({
    gameId,
    title,
    description,
    credit,
    streaming,
}: EditGameForm) {
    const data: Awaited<Parameters<typeof prisma.game.update>[0]["data"]> = {};
    if (title != null) {
        data.title = title;
    }
    if (description != null) {
        data.description = description;
    }
    if (credit != null) {
        data.credit = credit;
    }
    if (streaming != null) {
        data.streaming = streaming;
    }
    if (Object.keys(data).length === 0) {
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

export async function copyIconFile(
    fromContentId: number,
    toContentId: number,
    iconPath: string,
) {
    const bucket = getBucket();
    await getS3Client().send(
        new CopyObjectCommand({
            Bucket: bucket,
            Key: `${toContentId}/${iconPath}`,
            CopySource: `${bucket}/${fromContentId}/${iconPath}`,
        }),
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
            await endPlay({ playId, reason: "DEL_CONTENT" });
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
            try {
                await throwIfInvalidContentDir(newContentId);
                await deployGameZip(newContentId, gameZip);
                if (param.iconFile) {
                    await deployIconFile(
                        newContentId,
                        iconPath,
                        param.iconFile,
                    );
                } else {
                    await copyIconFile(param.contentId, newContentId, iconPath);
                }
                await endCurrentPlay(param.contentId);
                await deleteContentRecord(param.contentId);
                await deleteContentDir(param.contentId);
                await updateGameRecord(param);
                return {
                    ok: true,
                    contentId: newContentId,
                };
            } catch (err) {
                await deleteContentRecord(newContentId);
                await deleteContentDir(newContentId);
                throw err;
            }
        } else {
            if (param.iconFile) {
                const iconPath = toIconPath(param.iconFile);
                await deployIconFile(param.contentId, iconPath, param.iconFile);
                await updateContentRecord(param.contentId, iconPath);
            }
            await updateGameRecord(param);
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
