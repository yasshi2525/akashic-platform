import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@yasshi2525/persist-schema";
import { GUEST_NAME, PlayResponse } from "@/lib/types";
import { getAuth } from "@/lib/server/auth";
import { publicContentBaseUrl } from "@/lib/server/akashic";
import { fetchLicense } from "@/lib/server/game-info";
import { getContentExternal } from "@/lib/server/content-get-external";
import {
    checkLimitedPlayAccess,
    fetchGameJson,
    fetchPlayRemaining,
    fetchPlayToken,
    getContentViewSize,
} from "@/lib/server/play-utils";
import { isFavorited } from "@/lib/server/favorite";

const playViewSelect = {
    id: true,
    contentId: true,
    gameMasterId: true,
    name: true,
    isLimited: true,
    isActive: true,
    joinWord: true,
    inviteHash: true,
    createdAt: true,
    endedAt: true,
    gmUser: {
        select: {
            id: true,
            name: true,
            handle: true,
            image: true,
        },
    },
    content: {
        select: {
            icon: true,
            game: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    credit: true,
                    streaming: true,
                    playCount: true,
                    publisher: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    },
} satisfies Prisma.PlaySelect;

type PlayForView = Prisma.PlayGetPayload<{ select: typeof playViewSelect }>;

async function closedPlayResponse(
    play: PlayForView,
    user: Awaited<ReturnType<typeof getAuth>>,
): Promise<NextResponse<PlayResponse>> {
    const iconURL = `${publicContentBaseUrl}/${play.contentId}/${play.content.icon}`;
    return NextResponse.json({
        ok: true,
        data: {
            isActive: false,
            playName: play.name,
            isLimited: play.isLimited,
            createdAt: play.createdAt,
            endedAt: play.endedAt ?? undefined,
            gameMaster: {
                id: play.gameMasterId,
                userId: play.gmUser?.id ?? undefined,
                name: play.gmUser?.name ?? GUEST_NAME,
                iconURL: play.gmUser?.image ?? undefined,
                handle: play.gmUser?.handle ?? undefined,
            },
            game: {
                id: play.content.game.id,
                title: play.content.game.title,
                iconURL,
                description: play.content.game.description,
                credit: play.content.game.credit,
                streaming: play.content.game.streaming,
                playCount: play.content.game.playCount,
                publisher: {
                    id: play.content.game.publisher.id,
                    name: play.content.game.publisher.name!,
                    image: play.content.game.publisher.image ?? undefined,
                },
                contentId: play.contentId,
                isFavorited: await isFavorited(user, play.content.game.id),
                createdAt: play.content.game.createdAt,
                updatedAt: play.content.game.updatedAt,
            },
        },
    });
}

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/play/[id]">,
): Promise<NextResponse<PlayResponse>> {
    const { id: playId } = await ctx.params;
    const inviteHash = req.nextUrl.searchParams.get("inviteHash") ?? undefined;
    const joinWord = req.nextUrl.searchParams.get("joinWord") ?? undefined;
    if (playId == null) {
        return NextResponse.json({
            ok: false,
            reason: "InvalidParams",
        });
    }
    try {
        const play = await prisma.play.findUnique({
            where: {
                id: parseInt(playId),
            },
            select: playViewSelect,
        });
        if (!play) {
            return NextResponse.json({
                ok: false,
                reason: "NotFound",
            });
        }
        const user = await getAuth();
        if (!play.isActive) {
            return closedPlayResponse(play, user);
        }
        const denied = await checkLimitedPlayAccess(play, user?.id, {
            joinWord,
            inviteHash,
        });
        if (denied) {
            return NextResponse.json(denied);
        }
        const remaining = await fetchPlayRemaining(play.id);
        if (!remaining) {
            // 終了直後はDB未反映でactive。remaining の方がより確実
            return closedPlayResponse(play, user);
        }
        const gameJson = await fetchGameJson(play.contentId);
        return NextResponse.json({
            ok: true,
            data: {
                isActive: play.isActive,
                playToken: await fetchPlayToken(play.id, play.contentId),
                playName: play.name,
                isLimited: play.isLimited,
                joinWord: play.joinWord ?? undefined,
                inviteHash: play.inviteHash ?? undefined,
                gameMaster: {
                    id: play.gameMasterId,
                    userId: play.gmUser?.id ?? undefined,
                    name: play.gmUser?.name ?? GUEST_NAME,
                    iconURL: play.gmUser?.image ?? undefined,
                    handle: play.gmUser?.handle ?? undefined,
                },
                game: {
                    id: play.content.game.id,
                    title: play.content.game.title,
                    iconURL: `${publicContentBaseUrl}/${play.contentId}/${play.content.icon}`,
                    description: play.content.game.description,
                    credit: play.content.game.credit,
                    streaming: play.content.game.streaming,
                    playCount: play.content.game.playCount,
                    license: await fetchLicense(play.contentId),
                    publisher: {
                        id: play.content.game.publisher.id,
                        name: play.content.game.publisher.name!,
                        image: play.content.game.publisher.image ?? undefined,
                    },
                    contentId: play.contentId,
                    isFavorited: await isFavorited(user, play.content.game.id),
                    createdAt: play.content.game.createdAt,
                    updatedAt: play.content.game.updatedAt,
                },
                createdAt: play.createdAt,
                expiresAt: remaining.expiresAt,
                remainingMs: remaining.remainingMs,
                external: await getContentExternal(gameJson),
                ...(await getContentViewSize(gameJson)),
            },
        });
    } catch (err) {
        console.warn(`failed to join (playId = "${playId}")`, err);
        return NextResponse.json({
            ok: false,
            reason: "InternalError",
        });
    }
}
