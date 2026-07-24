import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import {
    internalPlaylogServerUrl,
    publicContentBaseUrl,
} from "@/lib/server/akashic";
import {
    AnonymousPlayInfo,
    GUEST_NAME,
    PlayInfo,
    PLAYLIST_LIMITS,
} from "@/lib/types";
import { getAuth } from "@/lib/server/auth";
import { anonKey } from "@/lib/server/anon-key";
import { getMuteSet, isMuted } from "@/lib/server/mute";

export async function GET(req: NextRequest) {
    const keyword = req.nextUrl.searchParams.get("keyword") ?? undefined;
    const gameMasterId =
        req.nextUrl.searchParams.get("gameMasterId") ?? undefined;
    const anonymous = req.nextUrl.searchParams.get("anonymous") === "true";
    const limits = parseInt(
        req.nextUrl.searchParams.get("limits") ?? PLAYLIST_LIMITS.toString(),
    );
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");

    const where: Awaited<
        NonNullable<Parameters<typeof prisma.play.findMany>[0]>["where"]
    > = { isActive: true };
    if (keyword) {
        where.OR = [
            {
                content: {
                    game: {
                        title: {
                            contains: keyword,
                        },
                    },
                },
            },
            {
                name: {
                    contains: keyword,
                },
            },
        ];
    }
    if (gameMasterId) {
        where.gameMasterId = gameMasterId;
    }

    const viewer = await getAuth();
    const muteSet = await getMuteSet(viewer);
    const rows = await prisma.play.findMany({
        take: limits,
        skip: page * limits,
        where,
        orderBy: {
            id: "desc",
        },
        select: {
            id: true,
            name: true,
            isLimited: true,
            requireSignIn: true,
            chatEnabled: true,
            gameMasterId: true,
            gmUserId: true,
            content: {
                select: {
                    id: true,
                    game: {
                        select: {
                            title: true,
                        },
                    },
                    icon: true,
                },
            },
            gmUser: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                },
            },
            createdAt: true,
        },
    });
    const gameMasterOf = (play: (typeof rows)[number]) => ({
        authorId: play.gmUserId,
        guestId: play.gmUserId ? null : play.gameMasterId,
    });
    // 件数はページングの後で減るが、部屋一覧は無限スクロールで
    // 追補されるため、ページを詰め直すより素直に落とす
    const result = rows.filter((play) => !isMuted(muteSet, gameMasterOf(play)));
    const participants = await Promise.all(
        result.map(async ({ id }) => {
            const res = await fetch(
                `${internalPlaylogServerUrl}/participants?playId=${id}`,
            );
            if (res.status !== 200) {
                console.warn(
                    `failed to get participants. (playId = "${id}", cause = "${await res.text()}")`,
                );
                return { id, participants: 0 };
            } else {
                return {
                    id,
                    participants: (await res.json()).participants as number,
                };
            }
        }),
    );
    if (anonymous) {
        return NextResponse.json({
            ok: true,
            data: result.map(
                ({
                    id,
                    isLimited,
                    requireSignIn,
                    chatEnabled,
                    content,
                    createdAt,
                }) => ({
                    id,
                    isLimited,
                    requireSignIn,
                    chatEnabled,
                    game: {
                        title: content.game.title,
                        iconURL: `${publicContentBaseUrl}/${content.id}/${content.icon}`,
                    },
                    participants:
                        participants.find((p) => p.id === id)?.participants ??
                        0,
                    createdAt,
                }),
            ) satisfies AnonymousPlayInfo[],
        });
    }
    return NextResponse.json({
        ok: true,
        data: result.map((play) => {
            const {
                id,
                name,
                isLimited,
                requireSignIn,
                chatEnabled,
                content,
                gmUser,
                createdAt,
            } = play;
            return {
                id,
                playName: name,
                isLimited,
                requireSignIn,
                chatEnabled,
                game: {
                    title: content.game.title,
                    iconURL: `${publicContentBaseUrl}/${content.id}/${content.icon}`,
                },
                gameMaster: {
                    userId: gmUser?.id ?? undefined,
                    name: gmUser?.name ?? GUEST_NAME,
                    iconURL: gmUser?.image ?? undefined,
                    anonKey: viewer
                        ? anonKey(gameMasterOf(play), viewer.id)
                        : undefined,
                },
                participants:
                    participants.find((p) => p.id === id)?.participants ?? 0,
                createdAt,
            };
        }) satisfies PlayInfo[],
    });
}
