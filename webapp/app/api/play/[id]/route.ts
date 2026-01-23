import { NextRequest, NextResponse } from "next/server";
import { GameConfiguration } from "@akashic/game-configuration";
import { Play, prisma } from "@yasshi2525/persist-schema";
import { PlayResponse } from "@/lib/types";
import { contentBaseUrl, playlogServerUrl } from "@/lib/server/akashic";

async function fetchViewSize(contentId: number) {
    const res = (await (
        await fetch(`${contentBaseUrl}/${contentId}/game.json`)
    ).json()) as GameConfiguration;
    return {
        width: res.width ?? 1280,
        height: res.height ?? 720,
    };
}

async function fetchPlayToken(play: Pick<Play, "id" | "contentId">) {
    const res = await fetch(`${playlogServerUrl}/join?playId=${play.id}`);
    if (res.status !== 200) {
        throw new Error(
            `playlog server responded error message. (contentId = "${play.contentId}", detail = "${await res.text()}")`,
        );
    }
    const json = (await res.json()) as { playToken: string };
    if (!json.playToken) {
        throw new Error(
            `playlog server responded invalid message. (contentId = "${play.contentId}", detail = "${json}")`,
        );
    }
    return json.playToken;
}

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
                gameMasterId: true,
            },
        });
        if (!play) {
            return NextResponse.json({
                ok: false,
                reason: "ClosedPlay",
            });
        }
        return NextResponse.json({
            ok: true,
            data: {
                playToken: await fetchPlayToken(play),
                contentId: play.contentId,
                gameMasterId: play.gameMasterId,
                ...(await fetchViewSize(play.contentId)),
            },
        });
    } catch (err) {
        console.warn(`failed to join (playId = "${playId}")`, err);
        return NextResponse.json({
            ok: false,
            reason: "InternalError",
        });
    }
}
