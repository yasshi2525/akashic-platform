"use server";

import * as process from "node:process";
import * as path from "node:path";
import fs from "node:fs";
import Jszip from "jszip";
import type { GameConfiguration } from "@akashic/game-configuration";
import { supportedAkashicModes, supportedAkashicVersions } from "../types";
import { prisma } from "@/lib/server/prisma";

interface GameForm {
    publisherId: string;
    gameId?: number;
    title: string;
    gameFile: File;
    iconFile: File;
    description: string;
}

const errReasons = [
    "InvalidParams",
    "NoGameJson",
    "InvalidGameJson",
    "UnsupportedVersion",
    "UnsupportedMode",
    "InternalError",
] as const;
export type RegisterContentErrorType = (typeof errReasons)[number];
type RegisterContentResponse =
    | { ok: true; contentId: number }
    | { ok: false; reason: RegisterContentErrorType };

export async function registerContent({
    publisherId,
    gameId,
    title,
    gameFile,
    iconFile,
    description,
}: GameForm): Promise<RegisterContentResponse> {
    if (!publisherId || !title || !gameFile || !iconFile || !description) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    if (gameId != null) {
        try {
            const game = await prisma.game.findUnique({
                where: {
                    id: gameId,
                },
            });
            if (game?.publisherId !== publisherId) {
                return {
                    ok: false,
                    reason: "InvalidParams",
                };
            }
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
    const zip = new Jszip();
    const gameZip = await zip.loadAsync(await gameFile.arrayBuffer());
    const gameJsonFile = gameZip.file("game.json");
    if (!gameJsonFile) {
        return {
            ok: false,
            reason: "NoGameJson",
        };
    }
    try {
        const gameJson: GameConfiguration = JSON.parse(
            await gameJsonFile.async("text"),
        );
        if (
            !supportedAkashicVersions.some(
                (ver) => ver === gameJson.environment?.["sandbox-runtime"],
            )
        ) {
            return {
                ok: false,
                reason: "UnsupportedVersion",
            };
        }
        if (
            !gameJson.environment?.nicolive?.supportedModes?.some(
                (mode) => supportedAkashicModes.indexOf(mode) !== -1,
            )
        ) {
            return {
                ok: false,
                reason: "UnsupportedMode",
            };
        }
    } catch (err) {
        return {
            ok: false,
            reason: "InvalidGameJson",
        };
    }
    try {
        if (gameId == null) {
            gameId = (
                await prisma.game.create({
                    data: {
                        publisherId,
                        title,
                        description,
                    },
                })
            ).id;
        } else {
            await prisma.game.update({
                data: {
                    title,
                    description,
                },
                where: {
                    id: gameId,
                },
            });
        }
        const icon = "icon" + path.extname(iconFile.name);
        const contentId = (
            await prisma.content.create({
                data: {
                    gameId,
                    icon,
                },
            })
        ).id;
        const baseDir = path.join(
            process.cwd(),
            "public",
            "content",
            contentId.toString(),
        );
        if (fs.existsSync(baseDir)) {
            console.warn(
                `failed to create content directory (contentId = "${contentId}", reason = "already exists ${baseDir}")`,
            );
            await prisma.content.delete({
                where: {
                    id: contentId,
                },
            });
            return {
                ok: false,
                reason: "InternalError",
            };
        }
        for (const filePath of Object.keys(gameZip.files)) {
            const file = gameZip.file(filePath);
            if (file) {
                if (file.dir) {
                    fs.mkdirSync(path.join(baseDir, file.name), {
                        recursive: true,
                    });
                } else {
                    fs.mkdirSync(path.join(baseDir, path.dirname(file.name)), {
                        recursive: true,
                    });
                    fs.writeFileSync(
                        path.join(baseDir, file.name),
                        await file.async("nodebuffer"),
                    );
                }
            }
        }
        fs.writeFileSync(path.join(baseDir, icon), await iconFile.bytes());
        return {
            ok: true,
            contentId,
        };
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
