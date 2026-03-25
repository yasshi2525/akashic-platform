import { NextRequest, NextResponse } from "next/server";
import {
    GetObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "@yasshi2525/persist-schema";
import {
    ClientLogEntry,
    ClientLogSubmitResponse,
    ClientLogsGetResponse,
} from "@/lib/types";
import { getAuth } from "@/lib/server/auth";
import {
    getBucket,
    getS3Client,
    s3KeyPrefix,
} from "@/lib/server/content-utils";

const RATE_LIMIT_SECONDS =
    parseInt(process.env.CLIENT_LOG_RATE_LIMIT_SECONDS ?? "30", 10) || 30;

function s3Key(contentId: string, playId: string, clientId: string) {
    return `${s3KeyPrefix}client-logs/${contentId}/${playId}/${clientId}.jsonl`;
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ id: string; playId: string }> },
): Promise<NextResponse<ClientLogSubmitResponse>> {
    const { id, playId } = await ctx.params;
    if (!id || !playId) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }

    let body: {
        logs?: unknown;
        errorMessage?: unknown;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }

    const { logs, errorMessage } = body;
    if (!Array.isArray(logs)) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }

    const sessionUser = await getAuth();
    if (!sessionUser) {
        return NextResponse.json({ ok: false, reason: "Unauthorized" });
    }

    const effectiveClientId = sessionUser.id;
    const effectiveUserId =
        sessionUser.authType === "oauth" ? sessionUser.id : null;

    const contentIdNum = parseInt(id, 10);
    const playIdNum = parseInt(playId, 10);
    if (isNaN(contentIdNum) || isNaN(playIdNum)) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }

    const play = await prisma.play.findUnique({
        where: { id: playIdNum },
        select: {
            id: true,
            contentId: true,
            content: { select: { game: { select: { id: true, title: true, publisherId: true } } } },
        },
    });
    if (!play || play.contentId !== contentIdNum) {
        return NextResponse.json({ ok: false, reason: "NotFound" });
    }

    // レートリミット確認
    const lastRecord = await prisma.clientLogRecord.findFirst({
        where: { playId: playIdNum, clientId: effectiveClientId },
        orderBy: { submittedAt: "desc" },
    });
    if (lastRecord) {
        const elapsedMs = Date.now() - lastRecord.submittedAt.getTime();
        const elapsedSec = elapsedMs / 1000;
        if (elapsedSec < RATE_LIMIT_SECONDS) {
            const retryAfterSeconds = Math.ceil(
                RATE_LIMIT_SECONDS - elapsedSec,
            );
            return NextResponse.json({
                ok: false,
                reason: "RateLimited",
                retryAfterSeconds,
            });
        }
    }

    // ログエントリをS3保存形式に変換
    const newEntries: ClientLogEntry[] = (
        logs as Array<{ timestamp?: unknown; level?: unknown; message?: unknown }>
    )
        .filter(
            (e) =>
                typeof e.timestamp === "number" &&
                (e.level === "log" ||
                    e.level === "warn" ||
                    e.level === "error") &&
                typeof e.message === "string",
        )
        .map((e) => ({
            timestamp: new Date(e.timestamp as number).toISOString(),
            level: e.level as "log" | "warn" | "error",
            message: e.message as string,
        }));

    const key = s3Key(id, playId, effectiveClientId);

    // 既存ファイルがあれば追記、なければ新規作成
    let existingContent = "";
    try {
        const result = await getS3Client().send(
            new GetObjectCommand({ Bucket: getBucket(), Key: key }),
        );
        existingContent =
            (await result.Body?.transformToString("utf-8")) ?? "";
    } catch (err) {
        if ((err as { Code?: string }).Code !== "NoSuchKey") {
            console.warn("failed to read existing client log", err);
            return NextResponse.json({ ok: false, reason: "InternalError" });
        }
    }

    const newLines = newEntries.map((e) => JSON.stringify(e)).join("\n");
    const combined = existingContent
        ? `${existingContent.trimEnd()}\n${newLines}`
        : newLines;

    try {
        await getS3Client().send(
            new PutObjectCommand({
                Bucket: getBucket(),
                Key: key,
                Body: combined,
                ContentType: "application/x-ndjson",
            }),
        );
    } catch (err) {
        console.warn("failed to write client log to S3", err);
        return NextResponse.json({ ok: false, reason: "InternalError" });
    }

    // DBにレコード保存
    await prisma.clientLogRecord.create({
        data: {
            playId: playIdNum,
            contentId: contentIdNum,
            clientId: effectiveClientId,
            userId: effectiveUserId,
            errorMessage:
                typeof errorMessage === "string" && errorMessage
                    ? errorMessage
                    : null,
        },
    });

    // 投稿主に通知
    try {
        const { game } = play.content;
        await prisma.notification.create({
            data: {
                userId: game.publisherId,
                unread: true,
                type: "CLIENT_LOG_SUBMITTED",
                body: `「${game.title}」のプレイ中にトラブルシュートログが届きました。`,
                iconURL: `${process.env.PUBLIC_BASE_URL}/api/game/${game.id}/icon`,
                link: `/game/${game.id}/logs#play-${playIdNum}`,
            },
        });
    } catch (err) {
        console.warn("failed to create client log notification", err);
    }

    return NextResponse.json({ ok: true });
}

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string; playId: string }> },
): Promise<NextResponse<ClientLogsGetResponse>> {
    const { id, playId } = await ctx.params;
    if (!id || !playId) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }

    const content = await prisma.content.findUnique({
        where: { id: parseInt(id, 10) },
        select: { game: { select: { publisherId: true } } },
    });
    if (!content) {
        return NextResponse.json({ ok: false, reason: "NotFound" });
    }

    const user = await getAuth();
    if (content.game.publisherId !== user?.id) {
        return NextResponse.json({ ok: false, reason: "Forbidden" });
    }

    const records = await prisma.clientLogRecord.findMany({
        where: { playId: parseInt(playId, 10), contentId: parseInt(id, 10) },
        orderBy: { submittedAt: "asc" },
        distinct: ["clientId"],
    });

    const submissions = await Promise.all(
        records.map(async (record) => {
            const key = s3Key(id, playId, record.clientId);
            let entries: ClientLogEntry[] = [];
            try {
                const result = await getS3Client().send(
                    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
                );
                const text = await result.Body?.transformToString("utf-8");
                if (text) {
                    entries = text
                        .split("\n")
                        .filter((l) => l.trim())
                        .map((l) => JSON.parse(l) as ClientLogEntry);
                }
            } catch (err) {
                if ((err as { Code?: string }).Code !== "NoSuchKey") {
                    console.warn("failed to read client log from S3", err);
                }
            }
            return {
                id: record.id,
                clientId: record.clientId,
                userId: record.userId,
                errorMessage: record.errorMessage,
                submittedAt: record.submittedAt,
                entries,
            };
        }),
    );

    return NextResponse.json({ ok: true, data: submissions });
}
