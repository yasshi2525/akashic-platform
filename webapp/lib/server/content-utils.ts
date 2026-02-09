import * as path from "node:path";
import * as process from "node:process";
import {
    DeleteObjectsCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    credit: string;
    streaming: boolean;
}

let s3Client: S3Client | undefined;
let s3PublicClient: S3Client | undefined;
export const s3KeyPrefix = process.env.S3_KEY_PREFIX ?? "";
const CONTENT_UPLOAD_EXPIRES_SECONDS = parseInt(
    process.env.S3_CONTENT_UPLOAD_EXPIRES_SECONDS ?? "60",
);

function buildS3Client(endpoint?: string) {
    return new S3Client({
        region: process.env.S3_REGION ?? "us-east-1",
        endpoint,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials:
            process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
                ? {
                      accessKeyId: process.env.S3_ACCESS_KEY,
                      secretAccessKey: process.env.S3_SECRET_KEY,
                  }
                : undefined,
    });
}

export function getS3Client() {
    if (!s3Client) {
        s3Client = buildS3Client(process.env.S3_ENDPOINT);
    }
    return s3Client;
}

export function getS3PublicClient() {
    if (!s3PublicClient) {
        s3PublicClient = buildS3Client(
            process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
        );
    }
    return s3PublicClient;
}

export function getBucket() {
    if (!process.env.S3_BUCKET) {
        throw new Error("S3_BUCKET is required.");
    }
    return process.env.S3_BUCKET;
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

export async function throwIfInvalidContentDir(contentId: number) {
    const res = await getS3Client().send(
        new ListObjectsV2Command({
            Bucket: getBucket(),
            Prefix: `${s3KeyPrefix}${contentId}/`,
            MaxKeys: 1,
        }),
    );
    if (res.Contents && res.Contents.length > 0) {
        throw new Error(
            `failed to create content directory (contentId = "${contentId}", reason = "already exists ${getBucket()}/${contentId}")`,
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

async function extractFile(contentId: number, file: JSZipObject) {
    if (file.dir) {
        return;
    }
    const key = `${s3KeyPrefix}${contentId}/${file.name}`;
    await uploadBySignedUrl({
        key,
        body: await file.async("nodebuffer"),
    });
}

export async function deployGameZip(contentId: number, gameZip: JSZip) {
    await Promise.all(
        Object.values(gameZip.files).map(
            async (file) => await extractFile(contentId, file),
        ),
    );
}

export async function deployIconFile(
    contentId: number,
    iconPath: string,
    iconFile: File,
) {
    const key = `${s3KeyPrefix}${contentId}/${iconPath}`;
    const contentType = iconFile.type || "application/octet-stream";
    await uploadBySignedUrl({
        key,
        body: await iconFile.bytes(),
        contentType,
    });
}

async function uploadBySignedUrl({
    key,
    body,
    contentType,
}: {
    key: string;
    body: Uint8Array;
    contentType?: string;
}) {
    const command = new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(getS3Client(), command, {
        expiresIn: CONTENT_UPLOAD_EXPIRES_SECONDS,
    });
    const headers: Record<string, string> = {};
    if (contentType) {
        headers["Content-Type"] = contentType;
    }
    const res = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: body as BodyInit,
    });
    if (!res.ok) {
        throw new Error(
            `failed to upload to s3 (key = "${key}", status = "${res.status}")`,
        );
    }
}

export async function deleteContentDir(contentId: number) {
    let continuationToken: string | undefined;
    do {
        const res = await getS3Client().send(
            new ListObjectsV2Command({
                Bucket: getBucket(),
                Prefix: `${s3KeyPrefix}${contentId}/`,
                ContinuationToken: continuationToken,
            }),
        );
        const objects = (res.Contents ?? [])
            .map((obj) => obj.Key)
            .filter((key) => Boolean(key))
            .map((key) => ({ Key: key }));
        if (objects.length > 0) {
            await getS3Client().send(
                new DeleteObjectsCommand({
                    Bucket: getBucket(),
                    Delete: {
                        Objects: objects,
                        Quiet: true,
                    },
                }),
            );
        }
        continuationToken = res.NextContinuationToken;
    } while (continuationToken);
}
