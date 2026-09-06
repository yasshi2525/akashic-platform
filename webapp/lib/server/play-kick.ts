import { prisma } from "@yasshi2525/persist-schema";
import { akashicServerUrl, withAkashicServerAuth } from "./akashic";

/**
 * revoke の呼び出し理由。BAN による切断か、上限超過分の間引きかをログで区別する。
 * 間引き("prune")は「BAN していないが cap 超過で失効」を意味し、通常は同一視聴者の
 * 既に閉じた古い socket が対象になる。
 */
export type RevokeReason = "ban" | "prune";

/**
 * 渡した PlaySession の playToken を akashic-server /kick で失効させ、socket を
 * 切断する（storage admin へ転送される）。失効に成功した行だけ削除し、失敗した
 * 行は残す（控えを消すと再 BAN で対象を見つけられず、未失効 token でソケットが
 * 生き続けるため）。BAN 時の kick と、上限超過分の間引きの両方から使う。
 */
export async function revokeSessions(
    sessions: { id: number; playId: number; playToken: string }[],
    reason: RevokeReason,
) {
    if (sessions.length === 0) {
        return;
    }
    const revokedIds = await Promise.all(
        sessions.map(async (s) => {
            try {
                const res = await fetch(
                    `${akashicServerUrl}/kick?playId=${s.playId}&playToken=${encodeURIComponent(
                        s.playToken,
                    )}`,
                    { headers: withAkashicServerAuth() },
                );
                if (!res.ok) {
                    console.warn(
                        `kick request failed (reason = "${reason}", playId = "${s.playId}", status = ${res.status})`,
                    );
                    return null;
                }
                return s.id;
            } catch (err) {
                console.warn(
                    `kick request error (reason = "${reason}", playId = "${s.playId}")`,
                    err,
                );
                return null;
            }
        }),
    );
    const succeeded = revokedIds.filter((id): id is number => id !== null);
    if (succeeded.length > 0) {
        await prisma.playSession.deleteMany({
            where: { id: { in: succeeded } },
        });
    }
}

/**
 * 対象視聴者を指定した部屋群から即時切断する。best-effort とし、切断に失敗しても
 * BAN 自体は再入室拒否側で担保される。
 */
export async function kickViewerFromPlays(playIds: number[], viewerId: string) {
    if (playIds.length === 0) {
        return;
    }
    const sessions = await prisma.playSession.findMany({
        where: { playId: { in: playIds }, viewerId },
        select: { id: true, playId: true, playToken: true },
    });
    await revokeSessions(sessions, "ban");
}
