import { NextRequest, NextResponse } from "next/server";
import { PlayResponse } from "@/lib/types";
import { prisma } from "@/lib/server/prisma";
import { playlogServerUrl } from "@/lib/server/akashic";

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/play/[id]">,
): Promise<NextResponse<PlayResponse>> {
    const { id: playId } = await ctx.params;
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
            },
        });
        if (!play) {
            return NextResponse.json({
                ok: false,
                reason: "ClosedPlay",
            });
        }

        const res = await fetch(`${playlogServerUrl}/join?playId=${playId}`);
        if (res.status !== 200) {
            console.warn(
                `failed to join (playId = "${playId}", reason = "server error", detail = "${await res.text()}")`,
            );
            return NextResponse.json({
                ok: false,
                reason: "InternalError",
            });
        }
        const json = (await res.json()) as { playToken: string };
        if (!json.playToken) {
            console.warn(
                `failed to join (playId = "${playId}", reason = "server error")`,
                json,
            );
            return NextResponse.json({
                ok: false,
                reason: "InternalError",
            });
        }

        return NextResponse.json({
            ok: true,
            playToken: json.playToken,
            contentId: play.contentId,
        });
    } catch (err) {
        console.warn(
            `failed to join (playId = "${playId}", reason = "database error")`,
            err,
        );
        return NextResponse.json({
            ok: false,
            reason: "InternalError",
        });
    }
}
