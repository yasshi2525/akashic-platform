import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { FavoriteToggleResponse } from "@/lib/types";
import { getAuth } from "@/lib/server/auth";
import { parse } from "date-fns";

export async function DELETE(
    _req: NextRequest,
    ctx: RouteContext<"/api/favorites/[gameId]">,
): Promise<NextResponse<FavoriteToggleResponse>> {
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
    const gameId = parseInt((await ctx.params).gameId);
    try {
        const deleted = await prisma.favorite.delete({
            where: {
                userId_gameId: {
                    userId: user.id,
                    gameId,
                },
            },
        });
        if (!deleted) {
            return NextResponse.json(
                {
                    ok: false,
                    reason: "NotFound",
                },
                {
                    status: 404,
                },
            );
        }
        return NextResponse.json({
            ok: true,
        });
    } catch (err) {
        console.warn(
            `failed to delete favorite (userId = ${user.id}, gameId = ${gameId})`,
            err,
        );
        return NextResponse.json(
            {
                ok: false,
                reason: "InternalError",
            },
            {
                status: 400,
            },
        );
    }
}
