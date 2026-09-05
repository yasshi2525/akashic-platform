import { prisma } from "@yasshi2525/persist-schema";
import type { User } from "../types";

const LABEL_BODY_MAX = 40;

export interface BanTarget {
    targetUserId?: string;
    targetGuestId?: string;
}

/** 視聴者を BAN 判定・PlaySession 照合に使う識別子へ落とす */
export function viewerKey(user: User): { viewerId: string } & BanTarget {
    if (user.authType === "oauth") {
        return { viewerId: user.id, targetUserId: user.id };
    }
    return { viewerId: user.id, targetGuestId: user.id };
}

/**
 * 視聴者がこの部屋から BAN されているか判定する。
 * サインイン部屋主の BAN はその部屋主の全部屋 (gmUserId) に、ゲスト部屋主の
 * BAN はその部屋のみ (playId) に効く。
 */
export async function isBannedFromPlay(
    user: User | null,
    play: { id: number; gmUserId: string | null },
): Promise<boolean> {
    if (!user) {
        return false;
    }
    const key = viewerKey(user);
    const target = key.targetUserId
        ? { targetUserId: key.targetUserId }
        : { targetGuestId: key.targetGuestId };
    const scope: { gmUserId?: string; playId?: number }[] = [
        { playId: play.id },
    ];
    if (play.gmUserId) {
        scope.push({ gmUserId: play.gmUserId });
    }
    const ban = await prisma.ban.findFirst({
        where: { ...target, OR: scope },
        select: { id: true },
    });
    return !!ban;
}

export function buildBanLabel(authorName: string, body: string) {
    const excerpt = body.trim().replace(/\s+/g, " ").slice(0, LABEL_BODY_MAX);
    return excerpt ? `${authorName}: ${excerpt}` : authorName;
}
