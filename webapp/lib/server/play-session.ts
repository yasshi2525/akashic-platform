import { prisma } from "@yasshi2525/persist-schema";
import { PLAY_SESSION_LIMIT_DEFAULT } from "../types";
import { revokeSessions } from "./play-kick";

// 視聴者×部屋あたりの PlaySession 上限。リロード/再検証で無制限に増えると
// BAN 時の kick fan-out が肥大化するため、古い記録を間引いて抑える。
const PLAY_SESSION_LIMIT = parseInt(
    process.env.PLAY_SESSION_LIMIT ?? `${PLAY_SESSION_LIMIT_DEFAULT}`,
);

/**
 * 入室時に視聴者へ発行した playToken を記録する。BAN 時に対象の socket を
 * 即時切断するためのハンドルになる。部屋終了時に akashic-server 側で削除する。
 * 記録に失敗すると追跡・kick 不能な token を渡すことになるため、握りつぶさず
 * 例外を伝播させ、呼び出し側（入室ルート）で token を返さず入室を失敗に倒す。
 */
export async function recordPlaySession(
    playId: number,
    viewerId: string,
    playToken: string,
) {
    await prisma.playSession.create({
        data: { playId, viewerId, playToken },
    });
    // 上限超過分の古い記録を間引く。ただし token を失効させずに行だけ消すと、
    // 参加者が古い token を保持したまま水増しして追跡対象から外れ、BAN を
    // 生き延びられてしまう。よって失効(revoke)してから削除する。記録自体は
    // 成功済みなので best-effort とし、間引きの失敗で入室を止めない
    try {
        const stale = await prisma.playSession.findMany({
            where: { playId, viewerId },
            orderBy: { id: "desc" },
            skip: PLAY_SESSION_LIMIT,
            select: { id: true, playId: true, playToken: true },
        });
        await revokeSessions(stale, "prune");
    } catch (err) {
        console.warn(
            `failed to prune play sessions (playId = "${playId}")`,
            err,
        );
    }
}
