import { NextResponse } from "next/server";
import { PlayParticipantsResponse } from "@/lib/types";
import { internalPlaylogServerUrl } from "@/lib/server/akashic";

export async function GET(
    _req: Request,
    ctx: RouteContext<"/api/play/[id]/participants">,
): Promise<NextResponse<PlayParticipantsResponse>> {
    const { id: playId } = await ctx.params;
    if (playId == null) {
        return NextResponse.json(
            { ok: false, reason: "InvalidParams" },
            { status: 400 },
        );
    }
    try {
        const res = await fetch(
            `${internalPlaylogServerUrl}/participants?playId=${playId}`,
        );
        if (res.status !== 200) {
            console.warn(
                `failed to get participants. (playId = "${playId}", cause = "${await res.text()}")`,
            );
            return NextResponse.json(
                { ok: false, reason: "InternalError" },
                { status: 502 },
            );
        }
        const participants = (await res.json()).participants as number;
        return NextResponse.json({ ok: true, participants });
    } catch (err) {
        console.warn(`failed to get participants. (playId = "${playId}")`, err);
        return NextResponse.json(
            { ok: false, reason: "InternalError" },
            { status: 502 },
        );
    }
}
