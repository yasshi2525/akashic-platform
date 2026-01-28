import { NextRequest, NextResponse } from "next/server";
import { GameResponse } from "@/lib/types";
import { fetchGameInfo } from "@/lib/server/game-info";

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
    try {
        return NextResponse.json({
            ok: true,
            data: await fetchGameInfo(parseInt(id)),
        });
    } catch (err) {
        console.warn(`failed to fetch game info (gameId = ${id})`, err);
        return NextResponse.json({
            ok: false,
            reason: "NotFound",
        });
    }
}
