import { NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { BoardMessageInfo, BoardMessagesGetResponse } from "@/lib/types";
import { boardMessageCutoff } from "@/lib/server/board-message";
import { getAuth } from "@/lib/server/auth";
import { anonKey } from "@/lib/server/anon-key";
import { getMuteSet, isMuted, MuteSet } from "@/lib/server/mute";

type BoardMessageRecord = {
    id: number;
    authorName: string;
    guestId: string | null;
    body: string;
    createdAt: Date;
    author: { id: string; name: string | null; image: string | null } | null;
};

function toInfo(
    message: BoardMessageRecord,
    viewerId: string | undefined,
    muteSet: MuteSet,
): BoardMessageInfo {
    const subject = {
        authorId: message.author?.id,
        guestId: message.guestId,
    };
    return {
        id: message.id,
        author: {
            id: message.author?.id ?? undefined,
            name: message.authorName,
            iconURL: message.author?.image ?? undefined,
            anonKey: viewerId ? anonKey(subject, viewerId) : undefined,
        },
        body: message.body,
        createdAt: message.createdAt,
        muted: isMuted(muteSet, subject) || undefined,
    };
}

export async function GET(): Promise<NextResponse<BoardMessagesGetResponse>> {
    try {
        const user = await getAuth();
        const muteSet = await getMuteSet(user);
        const messages = await prisma.boardMessage.findMany({
            where: {
                createdAt: { gte: boardMessageCutoff() },
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                authorName: true,
                guestId: true,
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
            data: messages.map((message) => toInfo(message, user?.id, muteSet)),
        });
    } catch (err) {
        console.warn("failed to fetch board messages", err);
        return NextResponse.json({
            ok: false,
            reason: "InternalError",
        });
    }
}
