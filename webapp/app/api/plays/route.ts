import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { GUEST_NAME, PlayInfo, PLAYLIST_LIMITS } from "@/lib/types";
import { playlogServerUrl } from "@/lib/server/akashic";

export async function GET(req: NextRequest) {
    const keyword = req.nextUrl.searchParams.get("keyword") ?? undefined;
    const limits = parseInt(
        req.nextUrl.searchParams.get("limits") ?? PLAYLIST_LIMITS.toString(),
    );
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");

    const containsKeyword: Awaited<
        NonNullable<Parameters<typeof prisma.play.findMany>[0]>["where"]
    > = keyword
        ? {
              content: {
                  game: {
                      title: {
                          contains: keyword,
                      },
                  },
              },
          }
        : undefined;

    const result = await prisma.play.findMany({
        take: limits,
        skip: page * limits,
        where: containsKeyword,
        orderBy: {
            id: "desc",
        },
        select: {
            id: true,
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
                    name: true,
                    image: true,
                },
            },
            createdAt: true,
        },
    });
    const participants = await Promise.all(
        result.map(async ({ id }) => {
            const res = await fetch(
                `${playlogServerUrl}/participants?playId=${id}`,
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
    return NextResponse.json({
        ok: true,
        data: result.map(({ id, content, gmUser, createdAt }) => ({
            id,
            game: {
                title: content.game.title,
                iconURL: `/content/${content.id}/${content.icon}`,
            },
            gameMaster: {
                name: gmUser?.name ?? GUEST_NAME,
                iconURL: gmUser?.image ?? undefined,
            },
            participants:
                participants.find((p) => p.id === id)?.participants ?? 0,
            createdAt,
        })) satisfies PlayInfo[],
    });
}
