import { NextRequest, NextResponse } from "next/server";
import { Play, prisma } from "@yasshi2525/persist-schema";
import { GUEST_NAME, PlayResponse } from "@/lib/types";
import { getAuth } from "@/lib/server/auth";
import {
    akashicServerUrl,
    internalPlaylogServerUrl,
    publicContentBaseUrl,
    withAkashicServerAuth,
} from "@/lib/server/akashic";
import { fetchLicense } from "@/lib/server/game-info";
import { getContentExternal } from "@/lib/server/content-get-external";
import { fetchGameJson, getContentViewSize } from "@/lib/server/play-utils";

async function fetchPlayToken(play: Pick<Play, "id" | "contentId">) {
    const res = await fetch(
        `${internalPlaylogServerUrl}/join?playId=${play.id}`,
    );
    if (res.status !== 200) {
        throw new Error(
            `playlog server responded error message. (contentId = "${play.contentId}", detail = "${await res.text()}")`,
        );
    }
    const json = (await res.json()) as { playToken: string };
    if (!json.playToken) {
        throw new Error(
            `playlog server responded invalid message. (contentId = "${play.contentId}", detail = "${json}")`,
        );
    }
    return json.playToken;
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
            select: {
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
            },
        });
        if (!play) {
            return NextResponse.json({
                ok: false,
                reason: "NotFound",
            });
        }
        if (!play.isActive) {
            const iconURL = `${publicContentBaseUrl}/${play.contentId}/${play.content.icon}`;
            return NextResponse.json({
                ok: true,
                data: {
                    isActive: play.isActive,
                    playName: play.name,
                    isLimited: play.isLimited,
                    createdAt: play.createdAt,
                    endedAt: play.endedAt ?? undefined,
                    gameMaster: {
                        id: play.gameMasterId,
                        userId: play.gmUser?.id ?? undefined,
                        name: play.gmUser?.name ?? GUEST_NAME,
                        iconURL: play.gmUser?.image ?? undefined,
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
                            image:
                                play.content.game.publisher.image ?? undefined,
                        },
                        contentId: play.contentId,
                        createdAt: play.content.game.createdAt,
                        updatedAt: play.content.game.updatedAt,
                    },
                },
            });
        }
        if (play.isLimited) {
            const user = await getAuth();
            if (user?.id !== play.gameMasterId) {
                if (inviteHash !== play.inviteHash) {
                    if (!joinWord) {
                        return NextResponse.json({
                            ok: false,
                            reason: "JoinWordRequired",
                        });
                    }
                    if (joinWord !== play.joinWord) {
                        return NextResponse.json({
                            ok: false,
                            reason: "InvalidJoinWord",
                        });
                    }
                }
            }
        }
        const res = await fetch(
            `${akashicServerUrl}/remaining?playId=${playId}`,
            { headers: withAkashicServerAuth() },
        );
        if (res.status !== 200) {
            console.warn(
                `failed to join because of /remaining error (playId = "${playId}")`,
                await res.text(),
            );
            return NextResponse.json({
                ok: false,
                reason: "InternalError",
            });
        }
        const { remainingMs, expiresAt } = (await res.json()) as {
            remainingMs: number;
            expiresAt: number;
        };
        const gameJson = await fetchGameJson(play.contentId);
        return NextResponse.json({
            ok: true,
            data: {
                isActive: play.isActive,
                playToken: await fetchPlayToken(play),
                playName: play.name,
                isLimited: play.isLimited,
                joinWord: play.joinWord ?? undefined,
                inviteHash: play.inviteHash ?? undefined,
                gameMaster: {
                    id: play.gameMasterId,
                    userId: play.gmUser?.id ?? undefined,
                    name: play.gmUser?.name ?? GUEST_NAME,
                    iconURL: play.gmUser?.image ?? undefined,
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
                    createdAt: play.content.game.createdAt,
                    updatedAt: play.content.game.updatedAt,
                },
                createdAt: play.createdAt,
                expiresAt,
                remainingMs,
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
