import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@yasshi2525/persist-schema";
import { getAuth } from "@/lib/server/auth";
import {
    getBucket,
    getS3Client,
    s3KeyPrefix,
} from "@/lib/server/content-utils";
import { ContentLogErrorType } from "@/lib/types";

/**
 * 正常の場合ログ生データをレスポンスボディに格納させたいため、JSON形式にしていない
 */
export async function GET(
    _req: NextRequest,
    ctx: RouteContext<"/api/content/[id]/play/[playId]/logs">,
): Promise<NextResponse<ContentLogErrorType | string>> {
    const { id, playId } = await ctx.params;
    if (id == null || playId == null) {
        return new NextResponse("InvalidParams", { status: 400 });
    }

    const content = await prisma.content.findUnique({
        where: { id: parseInt(id) },
        select: { game: { select: { publisherId: true } } },
    });
    if (!content) {
        return new NextResponse("NotFound", { status: 404 });
    }

    const user = await getAuth();
    if (content.game.publisherId !== user?.id) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    const filter = _req.nextUrl.searchParams.get("filter");

    try {
        const result = await getS3Client().send(
            new GetObjectCommand({
                Bucket: getBucket(),
                Key: `${s3KeyPrefix}content-logs/${id}/${playId}.jsonl`,
            }),
        );
        const body = await result.Body?.transformToString("utf-8");
        if (body == null) {
            return new NextResponse("NotFound", { status: 404 });
        }
        const responseBody =
            filter === "error"
                ? body
                      .split("\n")
                      .filter((line) => {
                          if (!line.trim()) return false;
                          try {
                              return (
                                  (
                                      JSON.parse(line) as {
                                          level?: string;
                                      }
                                  ).level === "error"
                              );
                          } catch {
                              return false;
                          }
                      })
                      .join("\n")
                : body;
        return new NextResponse(responseBody, {
            status: 200,
            headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
        });
    } catch (err) {
        const code = (err as { Code?: string }).Code;
        if (code === "NoSuchKey") {
            return new NextResponse("NotFound", { status: 404 });
        }
        console.warn(
            `failed to fetch content log (id = ${id}, playId = ${playId})`,
            err,
        );
        return new NextResponse("InternalError", { status: 500 });
    }
}
