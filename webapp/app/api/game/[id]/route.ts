import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { contentBaseUrl } from "@/lib/server/akashic";
import { GameResponse } from "@/lib/types";

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/game/[id]">,
): Promise<NextResponse<GameResponse>> {
    const { id } = await ctx.params;
    if (id == null) {
        return NextResponse.json({
            ok: false,
            reason: "InvalidParams",
        });
    }
    const game = await prisma.game.findUnique({
        where: {
            id: parseInt(id),
        },
        select: {
            id: true,
            title: true,
            description: true,
            publisher: {
                select: {
                    id: true,
                    name: true,
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
    });
    if (game == null) {
        return NextResponse.json({
            ok: false,
            reason: "NotFound",
        });
    }
    return NextResponse.json({
        ok: true,
        data: {
            id: game.id,
            title: game.title,
            iconURL: `${contentBaseUrl}/${game.versions[0].id}/${game.versions[0].icon}`,
            publisher: {
                id: game.publisher.id,
                name: game.publisher.name!,
            },
            description: game.description,
            contentId: game.versions[0].id,
            createdAt: game.createdAt,
            updatedAt: game.versions[0].updatedAt,
        },
    });
}
