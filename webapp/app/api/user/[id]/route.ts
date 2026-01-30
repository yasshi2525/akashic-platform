import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { UserProfileResponse } from "@/lib/types";

export async function GET(
    _req: NextRequest,
    ctx: RouteContext<"/api/user/[id]">,
): Promise<NextResponse<UserProfileResponse>> {
    const { id } = await ctx.params;
    if (id == null) {
        return NextResponse.json({
            ok: false,
            reason: "InvalidParams",
        });
    }
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            name: true,
            image: true,
        },
    });
    if (!user || !user.name) {
        return NextResponse.json({
            ok: false,
            reason: "NotFound",
        });
    }
    return NextResponse.json({
        ok: true,
        data: {
            id: user.id,
            name: user.name,
            image: user.image ?? undefined,
        },
    });
}
