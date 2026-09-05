import { prisma } from "@yasshi2525/persist-schema";

/**
 * 入室時に視聴者へ発行した playToken を記録する。BAN 時に対象の socket を
 * 即時切断するためのハンドルになる。部屋終了時に akashic-server 側で削除する。
 * 記録は付随処理のため、失敗しても入室自体は妨げない。
 */
export async function recordPlaySession(
    playId: number,
    viewerId: string,
    playToken: string,
) {
    try {
        await prisma.playSession.create({
            data: { playId, viewerId, playToken },
        });
    } catch (err) {
        console.warn(
            `failed to record play session (playId = "${playId}")`,
            err,
        );
    }
}
