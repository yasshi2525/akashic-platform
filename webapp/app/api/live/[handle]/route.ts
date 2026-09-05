import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { GUEST_NAME, LiveResponse } from "@/lib/types";
import { getAuthEnsuringGuest } from "@/lib/server/auth-ensure";
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
import { setPlayAccessCookie } from "@/lib/server/play-access-token";
import { isBannedFromPlay } from "@/lib/server/ban";
import { recordPlaySession } from "@/lib/server/play-session";
import { kickViewerFromPlays } from "@/lib/server/play-kick";

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
                requireSignIn: true,
                chatEnabled: true,
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
        // 身元の無い呼び出しにもゲストを発行し、発行する playToken を必ず
        // PlaySession に紐づける（追跡不能・kick 不能な token をなくす）
        const user = await getAuthEnsuringGuest();
        const denied = await checkLimitedPlayAccess(play, user, {
            joinWord,
        });
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
        if (
            await isBannedFromPlay(user, { id: play.id, gmUserId: gmUser.id })
        ) {
            return NextResponse.json({
                ok: true,
                data: {
                    owner,
                    requiresJoinWord: true,
                    reason: "Banned",
                },
            });
        }
        const remaining = await fetchPlayRemaining(play.id);
        if (!remaining) {
            // play 終了直後はまだ active だが、セッションは既に破棄済み。終了扱い
            return NextResponse.json({
                ok: true,
                data: {
                    owner,
                    requiresJoinWord: false,
                },
            });
        }
        const { remainingMs, expiresAt } = remaining;
        const gameJson = await fetchGameJson(play.contentId);
        const playToken = await fetchPlayToken(play.id, play.contentId);
        const res = NextResponse.json<LiveResponse>({
            ok: true,
            data: {
                owner,
                requiresJoinWord: false,
                info: {
                    id: play.id,
                    playToken,
                    playName: play.name,
                    isLimited: play.isLimited,
                    requireSignIn: play.requireSignIn,
                    chatEnabled: play.chatEnabled,
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
        if (user) {
            await recordPlaySession(play.id, user.id, playToken);
            // 記録の後にもう一度 BAN 判定し、入室と BAN 発行の競合を潰す
            if (
                await isBannedFromPlay(user, {
                    id: play.id,
                    gmUserId: gmUser.id,
                })
            ) {
                await kickViewerFromPlays([play.id], user.id);
                return NextResponse.json({
                    ok: true,
                    data: { owner, requiresJoinWord: true, reason: "Banned" },
                });
            }
            setPlayAccessCookie(res, play.id, user.id, req.cookies.getAll());
        }
        return res;
    } catch (err) {
        console.warn(`failed to get live play (handle = "${handle}")`, err);
        return NextResponse.json({ ok: false, reason: "InternalError" });
    }
}
