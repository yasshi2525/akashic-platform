import { NextRequest, NextResponse } from "next/server";
import { engineUrls, publicBaseUrl } from "@/lib/server/akashic";

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/content/[id]">,
) {
    const { id: contentId } = await ctx.params;
    return NextResponse.json({
        engine_urls: engineUrls.map((path) => publicBaseUrl + path),
        content_url: `${publicBaseUrl}/content/${contentId}/game.json`,
        asset_base_url: `${publicBaseUrl}/content/${contentId}`,
        untrusted: false,
        content_id: contentId,
        external: [],
    });
}
