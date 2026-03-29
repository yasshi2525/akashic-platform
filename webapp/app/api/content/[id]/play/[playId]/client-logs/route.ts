import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@yasshi2525/persist-schema";
import {
    ClientCapturedLog,
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

const RATE_LIMIT_SECONDS = parseInt(
    process.env.CLIENT_LOG_RATE_LIMIT_SECONDS ?? "30",
);

function s3Key(contentId: string, playId: string, clientId: string) {
    return `${s3KeyPrefix}client-logs/${contentId}/${playId}/${clientId}.jsonl`;
}

export async function POST(
    req: NextRequest,
    ctx: RouteContext<"/api/content/[id]/play/[playId]/client-logs">,
): Promise<NextResponse<ClientLogSubmitResponse>> {
    const { id, playId } = await ctx.params;
    if (!id || !playId) {
        return NextResponse.json({
            ok: false,
            reason: "InvalidParams",
        });
    }

    let logs: ClientCapturedLog[];
    let truncated: boolean;
    let comment: string | undefined;
    try {
        const body = await req.json();
        logs = body.logs;
        truncated = body.truncated === true;
        comment =
            typeof body.comment === "string" && body.comment.trim()
                ? body.comment.trim()
                : undefined;
        if (!Array.isArray(logs)) {
            return NextResponse.json({ ok: false, reason: "InvalidParams" });
        }
    } catch (err) {
        console.warn(
            `failed to parse request (contentId = "${id}", playId = "${playId}")`,
            err,
        );
        return NextResponse.json({
            ok: false,
            reason: "InvalidParams",
        });
    }

    const sessionUser = await getAuth();
    if (!sessionUser) {
        return NextResponse.json({
            ok: false,
            reason: "Unauthorized",
        });
    }

    const effectiveClientId = sessionUser.id;
    const effectiveUserId =
        sessionUser.authType === "oauth" ? sessionUser.id : null;

    const play = await prisma.play.findUnique({
        where: {
            id: parseInt(playId),
        },
        select: {
            id: true,
            contentId: true,
            content: {
                select: {
                    game: {
                        select: { id: true, title: true, publisherId: true },
                    },
                },
            },
        },
    });
    // サーバーから送られる contentLog に対して、クライアントから送られるので念の為バリデート
    if (!play || play.contentId !== parseInt(id)) {
        return NextResponse.json({
            ok: false,
            reason: "NotFound",
        });
    }

    // レートリミット確認
    const lastRecord = await prisma.clientLogRecord.findFirst({
        where: {
            playId: play.id,
            clientId: effectiveClientId,
        },
        orderBy: {
            submittedAt: "desc",
        },
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

    // ログエントリをS3保存形式に変換（comment は JSONL に含めず DB に保存）
    const now = new Date().toISOString();
    const logEntries: ClientLogEntry[] = logs
        .filter(
            (e) =>
                typeof e.timestamp === "number" &&
                (e.level === "log" ||
                    e.level === "warn" ||
                    e.level === "error") &&
                typeof e.message === "string",
        )
        .map(({ timestamp, level, message }) => ({
            timestamp: new Date(timestamp).toISOString(),
            level,
            message,
        }));

    const appendingEntries: ClientLogEntry[] = [
        ...(truncated
            ? [{ type: "truncation_marker" as const, timestamp: now }]
            : []),
        ...logEntries,
    ];

    const key = s3Key(id, playId, effectiveClientId);

    // 既存ファイルがあれば追記、なければ新規作成
    let existingContent = "";
    try {
        const result = await getS3Client().send(
            new GetObjectCommand({
                Bucket: getBucket(),
                Key: key,
            }),
        );
        existingContent = (await result.Body?.transformToString("utf-8")) ?? "";
    } catch (err) {
        if ((err as { Code?: string }).Code !== "NoSuchKey") {
            console.warn(
                `failed to read existing client log (contentId = "${id}", playId = "${playId}")`,
                err,
            );
            return NextResponse.json({
                ok: false,
                reason: "InternalError",
            });
        }
    }

    const appendingLines = appendingEntries
        .map((e) => JSON.stringify(e))
        .join("\n");
    const combined = existingContent
        ? `${existingContent.trimEnd()}\n${appendingLines}`
        : appendingLines;

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
        console.warn(
            `failed to write client log to S3 (contentId = "${id}", playId = "${playId}"`,
            err,
        );
        return NextResponse.json({
            ok: false,
            reason: "InternalError",
        });
    }

    // DBにレコード保存（comment も DB に格納）
    await prisma.clientLogRecord.create({
        data: {
            playId: play.id,
            contentId: play.contentId,
            clientId: effectiveClientId,
            userId: effectiveUserId,
            comment: comment ?? null,
        },
    });

    return NextResponse.json({ ok: true });
}

export async function GET(
    _req: NextRequest,
    ctx: RouteContext<"/api/content/[id]/play/[playId]/client-logs">,
): Promise<NextResponse<ClientLogsGetResponse>> {
    const { id, playId } = await ctx.params;
    if (!id || !playId) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }

    const content = await prisma.content.findUnique({
        where: {
            id: parseInt(id),
        },
        select: {
            id: true,
            game: {
                select: { publisherId: true },
            },
        },
    });
    if (!content) {
        return NextResponse.json({
            ok: false,
            reason: "NotFound",
        });
    }

    const user = await getAuth();
    if (content.game.publisherId !== user?.id) {
        return NextResponse.json({
            ok: false,
            reason: "Forbidden",
        });
    }

    // 全レコードを取得してクライアントごとに集約
    const allRecords = await prisma.clientLogRecord.findMany({
        where: {
            playId: parseInt(playId),
            contentId: content.id,
        },
        orderBy: {
            submittedAt: "asc",
        },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    });

    // clientId ごとに最初のレコード・全コメントを集約
    type ClientAgg = {
        firstRecord: (typeof allRecords)[0];
        comments: string[];
    };
    const clientMap = new Map<string, ClientAgg>();
    for (const record of allRecords) {
        if (!clientMap.has(record.clientId)) {
            clientMap.set(record.clientId, {
                firstRecord: record,
                comments: [],
            });
        }
        if (record.comment) {
            clientMap.get(record.clientId)!.comments.push(record.comment);
        }
    }

    const submissions = await Promise.all(
        [...clientMap.values()].map(async ({ firstRecord, comments }) => {
            const key = s3Key(id, playId, firstRecord.clientId);
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
                    console.warn(
                        `failed to read client log from S3 (contentId = "${id}, playId = "${playId}")`,
                        err,
                    );
                }
            }
            return {
                id: firstRecord.id,
                clientId: firstRecord.clientId,
                userId: firstRecord.userId,
                reporter: firstRecord.user
                    ? {
                          name: firstRecord.user.name,
                          image: firstRecord.user.image,
                      }
                    : null,
                submittedAt: firstRecord.submittedAt,
                entries,
                comments,
            };
        }),
    );

    return NextResponse.json({
        ok: true,
        data: submissions,
    });
}
