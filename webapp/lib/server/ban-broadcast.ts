import { prisma } from "@yasshi2525/persist-schema";
import { User } from "../types";
import {
    PlayerBanAction,
    buildBanNotificationEvent,
} from "../player-ban-protocol";
import { akashicServerUrl, withAkashicServerAuth } from "./akashic";
import { BanScope } from "./ban";
import { gamePlayerId } from "./game-player-id";
import { kickViewerFromPlays } from "./play-kick";
import { sessionViewerId } from "./viewer-identity";

/**
 * 拡張向けの通知イベントを 1 部屋へ注入する。best-effort とし、失敗しても
 * BAN 自体は入室ガードで担保される（kick と同じ方針）。
 */
async function sendPlayEvent(playId: number, event: unknown) {
    try {
        const res = await fetch(
            `${akashicServerUrl}/send-event?playId=${playId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...withAkashicServerAuth(),
                },
                body: JSON.stringify({ event }),
            },
        );
        if (!res.ok) {
            console.warn(
                `send-event request failed (playId = "${playId}", status = ${res.status})`,
            );
        }
    } catch (err) {
        console.warn(`send-event request error (playId = "${playId}")`, err);
    }
}

/**
 * BAN / 解除の確定を、その部屋主の全 active 部屋へ反映する。
 * ゲーム内・チャット・設定画面など、確定するあらゆる経路がここを通る。
 *
 * サインイン部屋主の BAN は全部屋に効くのだから、通知も全部屋に届かないと
 * コンテンツの表示と実態がずれる。
 */
export async function applyBanChange(param: {
    scope: BanScope;
    target: Pick<User, "authType" | "id">;
    action: PlayerBanAction;
}) {
    const playIds =
        "gmUserId" in param.scope
            ? (
                  await prisma.play.findMany({
                      where: { gmUserId: param.scope.gmUserId, isActive: true },
                      select: { id: true },
                  })
              ).map((p) => p.id)
            : [param.scope.playId];
    if (playIds.length === 0) {
        return;
    }
    // 注入を kick より先に行う。逆順だと、切断される本人の画面に退場が反映され
    // ないまま接続が切れる可能性が上がるため。
    //
    // ただし順序は保証できない。/send-event は storage が Valkey へ publish した
    // 時点で 200 を返し、active インスタンスがそれを tick に載せて配るのは非同期
    // なので、本人が tick を受け取る前に kick が届くことはありうる。保証するには
    // tick へ載ったことの ack が要るが、AMFlow にその口が無い。
    // 本人以外は切断されないので、進行から外す側の決定性には影響しない。
    const event = buildBanNotificationEvent(
        param.action,
        gamePlayerId(param.target),
    );
    await Promise.all(playIds.map((playId) => sendPlayEvent(playId, event)));
    if (param.action === "banned") {
        await kickViewerFromPlays(playIds, sessionViewerId(param.target));
    }
}
