import { NextRequest, NextResponse } from "next/server";
import { akashicServerUrl } from "@/lib/server/akashic";

export async function GET(
    req: NextRequest,
    ctx: RouteContext<"/api/play/[id]/remaining">,
) {
    const { id: playId } = await ctx.params;
    if (playId == null) {
        return NextResponse.json({ ok: false, reason: "InvalidParams" });
    }
    try {
        const res = await fetch(
            `${akashicServerUrl}/remaining?playId=${playId}`,
        );
        if (res.status === 200) {
            return NextResponse.json(await res.json());
        }
        if (res.status === 404) {
            return NextResponse.json({ ok: false, reason: "NotFound" });
        }
        return NextResponse.json({ ok: false, reason: "InternalError" });
    } catch (err) {
        console.warn(`failed to get remaining. (playId = "${playId}")`, err);
        return NextResponse.json({ ok: false, reason: "InternalError" });
    }
}
