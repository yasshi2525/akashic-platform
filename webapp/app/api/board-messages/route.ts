import { NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { BoardMessageInfo, BoardMessagesGetResponse } from "@/lib/types";
import { boardMessageCutoff } from "@/lib/server/board-message";

type BoardMessageRecord = {
    id: number;
    authorName: string;
    body: string;
    createdAt: Date;
    author: { id: string; name: string | null; image: string | null } | null;
};

function toInfo(message: BoardMessageRecord): BoardMessageInfo {
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

export async function GET(): Promise<NextResponse<BoardMessagesGetResponse>> {
    try {
        const messages = await prisma.boardMessage.findMany({
            where: {
                createdAt: { gte: boardMessageCutoff() },
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                authorName: true,
                body: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });
        return NextResponse.json({
            ok: true,
            data: messages.map(toInfo),
        });
    } catch (err) {
        console.warn("failed to fetch board messages", err);
        return NextResponse.json({
            ok: false,
            reason: "InternalError",
        });
    }
}
