import { NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { FavoriteListResponse, GameInfo } from "@/lib/types";
import { publicContentBaseUrl } from "@/lib/server/akashic";
import { fetchLicense } from "@/lib/server/game-info";
import { getAuth } from "@/lib/server/auth";

export async function GET(): Promise<NextResponse<FavoriteListResponse>> {
    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return NextResponse.json(
            {
                ok: false,
                reason: "Unauthorized",
            },
            {
                status: 401,
            },
        );
    }

    try {
        const favorites = await prisma.favorite.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
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
                        versions: {
                            take: 1,
                            select: {
                                id: true,
                                icon: true,
                                updatedAt: true,
                            },
                            orderBy: {
                                id: "desc",
                            },
                        },
                        createdAt: true,
                    },
                },
            },
        });

        const data: GameInfo[] = await Promise.all(
            favorites.map(async ({ game }) => ({
                id: game.id,
                title: game.title,
                iconURL: `${publicContentBaseUrl}/${game.versions[0].id}/${game.versions[0].icon}`,
                publisher: {
                    id: game.publisher.id,
                    name: game.publisher.name!,
                    image: game.publisher.image ?? undefined,
                },
                description: game.description,
                credit: game.credit,
                streaming: game.streaming,
                playCount: game.playCount,
                license: await fetchLicense(game.versions[0].id),
                contentId: game.versions[0].id,
                createdAt: game.createdAt,
                updatedAt: game.versions[0].updatedAt,
            })),
        );

        return NextResponse.json({
            ok: true,
            data,
        });
    } catch (err) {
        console.warn("failed to fetch favorite games.", err);
        return NextResponse.json(
            {
                ok: false,
                reason: "InternalError",
            },
            {
                status: 500,
            },
        );
    }
}
