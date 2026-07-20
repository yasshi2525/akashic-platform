import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { PlayChatGetResponse, PlayChatMessageInfo } from "@/lib/types";
import {
    authorizePlayChat,
    PLAY_CHAT_FETCH_LIMIT,
} from "@/lib/server/play-chat";

type PlayChatRecord = {
    id: number;
    authorName: string;
    body: string;
    createdAt: Date;
    author: { id: string; image: string | null } | null;
};

function toInfo(message: PlayChatRecord): PlayChatMessageInfo {
    return {
        id: message.id,
        author: {
            id: message.author?.id ?? undefined,
            name: message.authorName,
            iconURL: message.author?.image ?? undefined,
        },
        body: message.body,
        createdAt: message.createdAt,
    };
}

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/play/[id]/chat">,
): Promise<NextResponse<PlayChatGetResponse>> {
    const { id } = await ctx.params;
    const playId = parseInt(id);
    if (!Number.isSafeInteger(playId)) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }
    const afterParam = req.nextUrl.searchParams.get("after");
    const after = afterParam == null ? undefined : parseInt(afterParam);
    if (after != null && !Number.isSafeInteger(after)) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }
    try {
        const auth = await authorizePlayChat(playId);
        if (!auth.ok) {
            return NextResponse.json({ ok: false, reason: auth.reason });
        }
        const messages = await prisma.playChatMessage.findMany({
            where: {
                playId,
                ...(after != null ? { id: { gt: after } } : {}),
            },
            orderBy: { id: "desc" },
            take: PLAY_CHAT_FETCH_LIMIT,
            select: {
                id: true,
                authorName: true,
                body: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        image: true,
                    },
                },
            },
        });
        return NextResponse.json({
            ok: true,
            data: messages.reverse().map(toInfo),
        });
    } catch (err) {
        console.warn(`failed to fetch play chat (playId = "${playId}")`, err);
        return NextResponse.json({ ok: false, reason: "InternalError" });
    }
}
