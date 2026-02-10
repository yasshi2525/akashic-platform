"use server";

import { randomBytes } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@yasshi2525/persist-schema";
import { publicContentBaseUrl } from "./akashic";
import { getBucket, getS3Client, s3KeyPrefix } from "./content-utils";

const SHARE_PREFIX = "play-share";
const SHARE_UPLOAD_EXPIRES_SECONDS = Number.parseInt(
    process.env.S3_SHARE_UPLOAD_EXPIRES_SECONDS ?? "60",
);

const joinUrl = (baseUrl: string, path: string) =>
    `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export type PlayShareErrorType = "InvalidParams" | "NotFound" | "InternalError";

export type PlayShareResponse =
    | {
          ok: true;
          shareId: string;
          imageUrl: string;
          uploadUrl: string;
          uploadHeaders: Record<string, string>;
          expiresInSeconds: number;
      }
    | { ok: false; reason: PlayShareErrorType };

export async function getShareImagePath(playId: number, shareId: string) {
    return `${SHARE_PREFIX}/${playId}/${shareId}.png`;
}

export async function getShareImageUrl(playId: number, shareId: string) {
    return joinUrl(
        publicContentBaseUrl,
        await getShareImagePath(playId, shareId),
    );
}

function normalizeImageContentType(contentType?: string) {
    if (!contentType) {
        return "image/png";
    }
    if (!contentType.startsWith("image/")) {
        return "image/png";
    }
    return contentType;
}

export async function createPlayShareUploadUrl({
    playId,
    contentType,
}: {
    playId: string;
    contentType?: string;
}): Promise<PlayShareResponse> {
    if (!playId) {
        return { ok: false, reason: "InvalidParams" };
    }
    try {
        const parsedPlayId = Number.parseInt(playId);
        const play = await prisma.play.findUnique({
            where: { id: parsedPlayId },
            select: { id: true },
        });
        if (!play) {
            return { ok: false, reason: "NotFound" };
        }
        const shareId = randomBytes(3).toString("hex");
        const key = await getShareImagePath(parsedPlayId, shareId);
        const resolvedContentType = normalizeImageContentType(contentType);
        const command = new PutObjectCommand({
            Bucket: getBucket(),
            Key: `${s3KeyPrefix}${key}`,
            ContentType: resolvedContentType,
        });
        const uploadUrl = await getSignedUrl(getS3Client(), command, {
            expiresIn: SHARE_UPLOAD_EXPIRES_SECONDS,
        });
        const uploadHeaders = {
            "Content-Type": resolvedContentType,
        };
        return {
            ok: true,
            shareId,
            imageUrl: await getShareImageUrl(parsedPlayId, shareId),
            uploadUrl,
            uploadHeaders,
            expiresInSeconds: SHARE_UPLOAD_EXPIRES_SECONDS,
        };
    } catch (err) {
        console.warn(
            `failed to create play share upload url (playId = "${playId}")`,
            err,
        );
        return { ok: false, reason: "InternalError" };
    }
}
