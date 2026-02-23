import { NextRequest, NextResponse } from "next/server";
import {
    engineUrls,
    internalContentBaseUrl,
    publicContentBaseUrl,
    publicBaseUrl,
} from "@/lib/server/akashic";
import { fetchContentExternal } from "@/lib/server/content-get-external";

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/content/[id]">,
) {
    const { id: contentId } = await ctx.params;
    return NextResponse.json({
        engine_urls: engineUrls.map((path) => publicBaseUrl + path),
        content_url: `${publicContentBaseUrl}/${contentId}/game.json`,
        asset_base_url: `${publicContentBaseUrl}/${contentId}`,
        untrusted: false,
        content_id: contentId,
        external: await fetchContentExternal(
            `${internalContentBaseUrl}/${contentId}/game.json`,
        ),
    });
}
