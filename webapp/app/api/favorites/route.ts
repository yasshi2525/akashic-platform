import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { FavoriteListResponse, FavoriteToggleResponse, GameInfo } from "@/lib/types";
import { publicContentBaseUrl } from "@/lib/server/akashic";
import { fetchLicense } from "@/lib/server/game-info";
import { getAuth } from "@/lib/server/auth";

export async function GET(): Promise<NextResponse<FavoriteListResponse>> {
    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
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
                        select: { id: true, name: true, image: true },
                    },
                    versions: {
                        take: 1,
                        select: { id: true, icon: true, updatedAt: true },
                        orderBy: { id: "desc" },
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

    return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest): Promise<NextResponse<FavoriteToggleResponse>> {
    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const gameId = typeof body?.gameId === "number" ? body.gameId : NaN;
    if (isNaN(gameId)) {
        return NextResponse.json({ ok: false, reason: "InternalError" }, { status: 400 });
    }

    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) {
        return NextResponse.json({ ok: false, reason: "NotFound" }, { status: 404 });
    }

    const existing = await prisma.favorite.findUnique({
        where: { userId_gameId: { userId: user.id, gameId } },
        select: { id: true },
    });
    if (existing) {
        return NextResponse.json({ ok: false, reason: "AlreadyExists" }, { status: 409 });
    }

    await prisma.favorite.create({ data: { userId: user.id, gameId } });
    return NextResponse.json({ ok: true });
}
