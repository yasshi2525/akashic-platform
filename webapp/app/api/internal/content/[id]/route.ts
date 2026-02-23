import { NextRequest, NextResponse } from "next/server";
import {
    engineUrls,
    internalBaseUrl,
    internalContentBaseUrl,
} from "@/lib/server/akashic";
import { fetchContentExternal } from "@/lib/server/content-get-external";

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/internal/content/[id]">,
) {
    const { id: contentId } = await ctx.params;
    return NextResponse.json({
        engine_urls: engineUrls.map((path) => internalBaseUrl + path),
        content_url: `${internalContentBaseUrl}/${contentId}/game.json`,
        asset_base_url: `${internalContentBaseUrl}/${contentId}`,
        untrusted: false,
        content_id: contentId,
        external: await fetchContentExternal(
            `${internalContentBaseUrl}/${contentId}/game.json`,
        ),
    });
}
