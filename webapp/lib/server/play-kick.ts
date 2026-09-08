import { prisma } from "@yasshi2525/persist-schema";
import { akashicServerUrl, withAkashicServerAuth } from "./akashic";

/**
 * 対象視聴者を指定した部屋群から即時切断する。記録済みの playToken ごとに
 * akashic-server の /kick を叩いて失効させる。best-effort とし、切断に失敗しても
 * BAN は再入室拒否側で担保。
 *
 * WHY: 成功しても PlaySession は消さない。この行が「その視聴者がこの部屋に居た」
 * 唯一の部屋スコープの証跡で、ゲーム内BANはこれを使って in-game playerId から
 * 対象を引く。消すと、コンテンツが自分で BAN した相手を解除できなくなる。
 * 失効済み token を再入室で配ってしまわないよう、行は BAN 解除時に消す
 * （[ban-broadcast] の applyBanChange）。
 */
export async function kickViewerFromPlays(playIds: number[], viewerId: string) {
    if (playIds.length === 0) {
        return;
    }
    const sessions = await prisma.playSession.findMany({
        where: { playId: { in: playIds }, viewerId },
        select: { id: true, playId: true, playToken: true },
    });
    await Promise.all(
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
                        `kick request failed (playId = "${s.playId}", status = ${res.status})`,
                    );
                }
            } catch (err) {
                console.warn(
                    `kick request error (playId = "${s.playId}")`,
                    err,
                );
            }
        }),
    );
}
