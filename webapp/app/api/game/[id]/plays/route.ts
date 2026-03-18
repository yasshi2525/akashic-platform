import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { getAuth } from "@/lib/server/auth";
import { GUEST_NAME, PLAY_LOG_LIMITS } from "@/lib/types";

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await ctx.params;
    const gameId = parseInt(idStr);
    if (!Number.isFinite(gameId)) {
        return new NextResponse("InvalidParams", { status: 400 });
    }

    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { publisherId: true },
    });
    if (!game) {
        return new NextResponse("NotFound", { status: 404 });
    }
    if (game.publisherId !== user.id) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    const limits = parseInt(
        req.nextUrl.searchParams.get("limits") ?? PLAY_LOG_LIMITS.toString(),
    );
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");

    const where = { isActive: false, content: { gameId } } as const;

    const [plays, total] = await prisma.$transaction([
        prisma.play.findMany({
            take: limits,
            skip: page * limits,
            where,
            orderBy: { id: "desc" },
            select: {
                id: true,
                contentId: true,
                name: true,
                gmUser: { select: { id: true, name: true, image: true } },
                createdAt: true,
                endedAt: true,
                logUploadedAt: true,
                crashed: true,
                errorLogged: true,
            },
        }),
        prisma.play.count({ where }),
    ]);

    return NextResponse.json({
        ok: true,
        data: plays.map((play) => ({
            id: play.id,
            contentId: play.contentId,
            name: play.name,
            gameMaster: {
                userId: play.gmUser?.id ?? undefined,
                name: play.gmUser?.name ?? GUEST_NAME,
                iconURL: play.gmUser?.image ?? undefined,
            },
            createdAt: play.createdAt,
            endedAt: play.endedAt,
            logUploadedAt: play.logUploadedAt,
            crashed: play.crashed,
            errorLogged: play.errorLogged,
        })),
        total,
    });
}
