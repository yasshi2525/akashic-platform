import { prisma } from "@yasshi2525/persist-schema";

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
}
