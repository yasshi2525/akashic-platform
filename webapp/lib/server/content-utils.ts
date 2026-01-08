import fs from "node:fs";
import * as path from "node:path";
import JSZip, { JSZipObject } from "jszip";
import { GameConfiguration } from "@akashic/game-configuration";
import { prisma } from "@yasshi2525/persist-schema";
import {
    ContentErrorResponse,
    supportedAkashicModes,
    supportedAkashicVersions,
} from "../types";

export interface GameForm {
    title: string;
    gameFile: File;
    iconFile: File;
    description: string;
}

export async function extractGameFile(gameFile: File) {
    const zip = new JSZip();
    return await zip.loadAsync(await gameFile.arrayBuffer());
}

export async function validateGameZip(
    gameZip: JSZip,
): Promise<ContentErrorResponse | undefined> {
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
}

export function toIconPath(iconFile: File) {
    return "icon" + path.extname(iconFile.name);
}

export function toContentDir(contentId: number) {
    return path.join(process.cwd(), "public", "content", contentId.toString());
}

export function throwIfInvalidContentDir(
    contentDir: string,
    contentId: number,
) {
    if (fs.existsSync(contentDir)) {
        throw new Error(
            `failed to create content directory (contentId = "${contentId}", reason = "already exists ${contentDir}")`,
        );
    }
}

export async function createContentRecord(gameId: number, iconPath: string) {
    return (
        await prisma.content.create({
            data: {
                gameId,
                icon: iconPath,
            },
        })
    ).id;
}

export async function deleteContentRecord(contentId: number) {
    await prisma.content.delete({
        where: {
            id: contentId,
        },
    });
}

async function extractFile(baseDir: string, file: JSZipObject) {
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

export async function deployGameZip(contentDir: string, gameZip: JSZip) {
    await Promise.all(
        Object.values(gameZip.files).map(
            async (file) => await extractFile(contentDir, file),
        ),
    );
}

export function toIconAbsPath(contentDir: string, iconPath: string) {
    return path.join(contentDir, iconPath);
}

export async function deployIconFile(
    contentDir: string,
    iconPath: string,
    iconFile: File,
) {
    fs.writeFileSync(
        toIconAbsPath(contentDir, iconPath),
        await iconFile.bytes(),
    );
}

export async function deleteContentDir(contentDir: string) {
    fs.rmSync(contentDir, { recursive: true, force: true });
}
