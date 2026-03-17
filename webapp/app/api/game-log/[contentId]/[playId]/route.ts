import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { getAuth } from "@/lib/server/auth";
import {
    getBucket,
    getS3Client,
    s3KeyPrefix,
} from "@/lib/server/content-utils";

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ contentId: string; playId: string }> },
) {
    const { contentId: contentIdStr, playId: playIdStr } = await ctx.params;
    const contentId = parseInt(contentIdStr);
    const playId = parseInt(playIdStr);
    if (!Number.isFinite(contentId) || !Number.isFinite(playId)) {
        return new NextResponse("InvalidParams", { status: 400 });
    }

    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { game: { select: { publisherId: true } } },
    });
    if (!content) {
        return new NextResponse("NotFound", { status: 404 });
    }
    if (content.game.publisherId !== user.id) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const result = await getS3Client().send(
            new GetObjectCommand({
                Bucket: getBucket(),
                Key: `${s3KeyPrefix}play-logs/${contentId}/${playId}.jsonl`,
            }),
        );
        const body = await result.Body?.transformToString("utf-8");
        if (body == null) {
            return new NextResponse("NotFound", { status: 404 });
        }
        return new NextResponse(body, {
            status: 200,
            headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
        });
    } catch (err: unknown) {
        const code = (err as { Code?: string }).Code;
        if (code === "NoSuchKey") {
            return new NextResponse("NotFound", { status: 404 });
        }
        console.warn(
            `failed to fetch game log (contentId = ${contentId}, playId = ${playId})`,
            err,
        );
        return new NextResponse("InternalServerError", { status: 500 });
    }
}
