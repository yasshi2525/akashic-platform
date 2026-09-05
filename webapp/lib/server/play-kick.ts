import { prisma } from "@yasshi2525/persist-schema";
import { akashicServerUrl, withAkashicServerAuth } from "./akashic";

/**
 * 対象視聴者を指定した部屋群から即時切断する。記録済みの playToken ごとに
 * akashic-server の /kick を叩く（storage admin へ転送される）。
 * best-effort とし、切断に失敗しても BAN 自体は再入室拒否側で担保される。
 * 切断後は使い終えた PlaySession を消す。
 */
export async function kickViewerFromPlays(playIds: number[], viewerId: string) {
    if (playIds.length === 0) {
        return;
    }
    const sessions = await prisma.playSession.findMany({
        where: { playId: { in: playIds }, viewerId },
        select: { playId: true, playToken: true },
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
    await prisma.playSession.deleteMany({
        where: { playId: { in: playIds }, viewerId },
    });
}
