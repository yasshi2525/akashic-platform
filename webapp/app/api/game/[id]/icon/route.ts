import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { publicContentBaseUrl } from "@/lib/server/akashic";

export async function GET(
    _req: NextRequest,
    ctx: RouteContext<"/api/game/[id]/icon">,
) {
    const { id } = await ctx.params;
    if (id == null) {
        return NextResponse.json(
            {
                ok: false,
                reason: "InvalidParams",
            },
            {
                status: 400,
            },
        );
    }

    try {
        const game = await prisma.game.findUniqueOrThrow({
            where: { id: parseInt(id) },
            select: {
                versions: {
                    take: 1,
                    select: {
                        id: true,
                        icon: true,
                    },
                    orderBy: {
                        id: "desc",
                    },
                },
            },
        });

        if (!game.versions[0]) {
            return new NextResponse("NotFound", { status: 404 });
        }

        return NextResponse.redirect(
            `${publicContentBaseUrl}/${game.versions[0].id}/${game.versions[0].icon}`,
            302,
        );
    } catch (err) {
        console.warn(`failed to fetch game icon (gameId = ${id})`, err);
        return new NextResponse("NotFound", { status: 404 });
    }
}
