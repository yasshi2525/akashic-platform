import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { GUEST_NAME, LiveResponse } from "@/lib/types";
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

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/live/[handle]">,
): Promise<NextResponse<LiveResponse>> {
    const { handle } = await ctx.params;
    const joinWord = req.nextUrl.searchParams.get("joinWord") ?? undefined;
    if (!handle) {
        return NextResponse.json({
            ok: false,
            reason: "NotFound",
        });
    }
    try {
        const gmUser = await prisma.user.findUnique({
            where: { handle },
            select: {
                id: true,
                name: true,
                handle: true,
                image: true,
            },
        });
        if (!gmUser) {
            return NextResponse.json({
                ok: false,
                reason: "NotFound",
            });
        }
        const play = await prisma.play.findFirst({
            where: {
                gmUserId: gmUser.id,
                isActive: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                contentId: true,
                gameMasterId: true,
                name: true,
                isLimited: true,
                joinWord: true,
                inviteHash: true,
                createdAt: true,
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
            },
        });
        const owner = {
            userId: gmUser.id,
            name: gmUser.name ?? GUEST_NAME,
            iconURL: gmUser.image ?? undefined,
        };
        if (!play) {
            return NextResponse.json({
                ok: true,
                data: {
                    owner,
                    requiresJoinWord: false,
                },
            });
        }
        const user = await getAuth();
        const denied = checkLimitedPlayAccess(play, user?.id, { joinWord });
        if (denied) {
            return NextResponse.json({
                ok: true,
                data: {
                    owner,
                    requiresJoinWord: true,
                    reason: denied.reason,
                },
            });
        }
        const { remainingMs, expiresAt } = await fetchPlayRemaining(play.id);
        const gameJson = await fetchGameJson(play.contentId);
        return NextResponse.json({
            ok: true,
            data: {
                owner,
                requiresJoinWord: false,
                info: {
                    id: play.id,
                    playToken: await fetchPlayToken(play.id, play.contentId),
                    playName: play.name,
                    isLimited: play.isLimited,
                    joinWord: play.joinWord ?? undefined,
                    inviteHash: play.inviteHash ?? undefined,
                    gameMaster: {
                        id: play.gameMasterId,
                        userId: gmUser.id,
                        name: gmUser.name ?? GUEST_NAME,
                        iconURL: gmUser.image ?? undefined,
                        handle: gmUser.handle ?? undefined,
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
                            image:
                                play.content.game.publisher.image ?? undefined,
                        },
                        contentId: play.contentId,
                        isFavorited: await isFavorited(
                            user,
                            play.content.game.id,
                        ),
                        createdAt: play.content.game.createdAt,
                        updatedAt: play.content.game.updatedAt,
                    },
                    createdAt: play.createdAt,
                    expiresAt,
                    remainingMs,
                    external: await getContentExternal(gameJson),
                    ...(await getContentViewSize(gameJson)),
                },
            },
        });
    } catch (err) {
        console.warn(`failed to get live play (handle = "${handle}")`, err);
        return NextResponse.json({ ok: false, reason: "InternalError" });
    }
}
