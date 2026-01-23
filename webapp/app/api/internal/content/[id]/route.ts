import { NextRequest, NextResponse } from "next/server";
import { GameConfiguration } from "@akashic/game-configuration";
import {
    contentBaseUrl,
    engineUrls,
    internalBaseUrl,
    publicBaseUrl,
} from "@/lib/server/akashic";

async function getExternal(contentId: string) {
    try {
        const gameJson = (await (
            await fetch(`${contentBaseUrl}/${contentId}/game.json`)
        ).json()) as GameConfiguration;
        return Object.keys(gameJson.environment?.external ?? {});
    } catch (err) {
        console.warn(
            `failed to fetch external from game.json (contentId = "${contentId}")`,
            err,
        );
        return [];
    }
}

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/internal/content/[id]">,
) {
    const { id: contentId } = await ctx.params;
    return NextResponse.json({
        engine_urls: engineUrls.map((path) => internalBaseUrl + path),
        content_url: `${contentBaseUrl}/${contentId}/game.json`,
        asset_base_url: `${contentBaseUrl}/${contentId}`,
        untrusted: false,
        content_id: contentId,
        external: await getExternal(contentId),
    });
}
