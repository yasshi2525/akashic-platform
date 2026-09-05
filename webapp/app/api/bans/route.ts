import { NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { BansGetResponse } from "@/lib/types";
import { getAuth } from "@/lib/server/auth";

export async function GET(): Promise<NextResponse<BansGetResponse>> {
    try {
        const user = await getAuth();
        if (!user) {
            return NextResponse.json({ ok: false, reason: "Unauthorized" });
        }
        // 自分が部屋主として発行した BAN のみ
        const owner =
            user.authType === "oauth"
                ? { gmUserId: user.id }
                : { gmGuestId: user.id };
        const bans = await prisma.ban.findMany({
            where: owner,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                labelSnapshot: true,
                playId: true,
                createdAt: true,
            },
        });
        return NextResponse.json({
            ok: true,
            data: bans.map((ban) => ({
                id: ban.id,
                label: ban.labelSnapshot,
                allRooms: ban.playId == null,
                createdAt: ban.createdAt,
            })),
        });
    } catch (err) {
        console.warn("failed to fetch bans", err);
        return NextResponse.json({ ok: false, reason: "InternalError" });
    }
}
