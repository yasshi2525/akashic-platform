"use server";

import { cookies, headers } from "next/headers";
import { prisma } from "@yasshi2525/persist-schema";
import {
    BAN_IN_GAME_RATE_MAX_DEFAULT,
    BAN_IN_GAME_RATE_WINDOW_SECONDS_DEFAULT,
    GUEST_NAME,
    User,
} from "../types";
import { BanResultReason } from "../player-ban-protocol";
import { getAuth } from "./auth";
import { BAN_LIMIT, BanScope, buildBanLabel, countGmBans } from "./ban";
import { archiveBanRequest } from "./ban-audit";
import { applyBanChange } from "./ban-broadcast";
import { issueBanUndoToken, verifyBanUndoToken } from "./ban-undo-token";
import { gamePlayerId, resolveGamePlayer } from "./game-player-id";
import { playOwnerCookieName } from "./play-owner-token";
import { verifyRoomOwner } from "./viewer-identity";

const RATE_WINDOW_SECONDS = parseInt(
    process.env.BAN_IN_GAME_RATE_WINDOW_SECONDS ??
        `${BAN_IN_GAME_RATE_WINDOW_SECONDS_DEFAULT}`,
);
const RATE_MAX = parseInt(
    process.env.BAN_IN_GAME_RATE_MAX ?? `${BAN_IN_GAME_RATE_MAX_DEFAULT}`,
);

export type InGameBanResponse =
    | {
          ok: true;
          label: string;
          /**
           * 要求が実際に効いたか。解除で false になるのは、ゲームから外せない
           * BAN（ブロック連動など MANUAL 以外）が残り入室禁止が続く場合。
           */
          effective: boolean;
          /**
           * この BAN を取り消すときに指定する署名。kick 後は in-game playerId から
           * 対象を引けなくなるため、UI の「取り消す」はこれを送り返す。
           */
          undoToken?: string;
      }
    | { ok: false; reason: BanResultReason };

/**
 * 部屋単位の連打窓。
 *
 * WHY: ゲーム内BANはコンテンツから自動で叩けるため、チャットのように行の件数で
 * 数える窓では押さえられない（BAN と解除を交互に呼ばれると行が残らない）。
 * 要求そのものをプロセス内で数える。厳密な分散制御ではなく事故防止の目安。
 */
const rateWindows = new Map<number, number[]>();

function consumeRateLimit(playId: number): boolean {
    const now = Date.now();
    const since = now - RATE_WINDOW_SECONDS * 1000;
    const recent = (rateWindows.get(playId) ?? []).filter((at) => at > since);
    if (recent.length >= RATE_MAX) {
        rateWindows.set(playId, recent);
        return false;
    }
    recent.push(now);
    rateWindows.set(playId, recent);
    return true;
}

function banScopeOf(
    user: Pick<User, "authType" | "id">,
    playId: number,
): BanScope {
    return user.authType === "oauth"
        ? { gmUserId: user.id, playId: null }
        : { gmGuestId: user.id, playId };
}

function banTargetOf(target: Pick<User, "authType" | "id">) {
    return target.authType === "oauth"
        ? { targetUserId: target.id }
        : { targetGuestId: target.id };
}

async function authorize(
    playId: number,
    targetPlayerId: string,
    undoToken?: string,
) {
    if (!Number.isSafeInteger(playId) || !targetPlayerId) {
        return { ok: false, reason: "InternalError" } as const;
    }
    const user = await getAuth();
    if (!user) {
        return { ok: false, reason: "Unauthorized" } as const;
    }
    const play = await prisma.play.findUnique({
        where: { id: playId },
        select: {
            id: true,
            isActive: true,
            gameMasterId: true,
            gmUserId: true,
        },
    });
    if (!play || !play.isActive) {
        return { ok: false, reason: "InternalError" } as const;
    }
    // コンテンツは webapp と同一オリジンで動きプラグインを経由せずここを叩ける。
    // 発行元はクライアントから受け取らず、必ずサーバー側で判定し直す
    const ownerToken = (await cookies()).get(
        playOwnerCookieName(play.id),
    )?.value;
    if (!verifyRoomOwner(play, user, ownerToken)) {
        return { ok: false, reason: "NotGameMaster" } as const;
    }
    if (gamePlayerId(user) === targetPlayerId) {
        return { ok: false, reason: "SelfBan" } as const;
    }
    if (!consumeRateLimit(play.id)) {
        return { ok: false, reason: "LimitExceeded" } as const;
    }
    const scope = banScopeOf(user, play.id);
    // 在籍者から引くのが基本。kick 済みで PlaySession が消えている相手は、BAN 時に
    // サーバーが発行した署名でのみ指せる。token が別人を指していたら採用しない
    const undoTarget = verifyBanUndoToken(undoToken, play.id);
    const target =
        undoTarget && gamePlayerId(undoTarget) === targetPlayerId
            ? undoTarget
            : await resolveGamePlayer(targetPlayerId, play.id);
    if (!target) {
        return { ok: false, reason: "NotInRoom" } as const;
    }
    return { ok: true, user, play, scope, target } as const;
}

/** 解除 UI で相手を判別するための表示名。コンテンツから渡された名前は使わない */
async function buildLabel(
    playId: number,
    target: Pick<User, "authType" | "id">,
) {
    if (target.authType === "oauth") {
        const user = await prisma.user.findUnique({
            where: { id: target.id },
            select: { name: true },
        });
        if (user?.name) {
            return buildBanLabel(user.name, "");
        }
    }
    const message = await prisma.playChatMessage.findFirst({
        where:
            target.authType === "oauth"
                ? { playId, authorId: target.id }
                : { playId, guestId: target.id },
        orderBy: { id: "desc" },
        select: { authorName: true },
    });
    return buildBanLabel(message?.authorName ?? GUEST_NAME, "");
}

async function archive(param: {
    playId: number;
    action: "BAN" | "UNBAN";
    scope: BanScope;
    target: Pick<User, "authType" | "id">;
    applied: boolean;
}) {
    const requestHeaders = await headers();
    await archiveBanRequest({
        playId: param.playId,
        source: "IN_GAME",
        action: param.action,
        gmUserId: "gmUserId" in param.scope ? param.scope.gmUserId : undefined,
        gmGuestId:
            "gmGuestId" in param.scope ? param.scope.gmGuestId : undefined,
        ...banTargetOf(param.target),
        applied: param.applied,
        ip:
            requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            undefined,
        userAgent: requestHeaders.get("user-agent") ?? undefined,
        requestedAt: new Date(),
    });
}

/**
 * コンテンツからの要求で、部屋主がプレイヤーを BAN する。
 * スコープはサイトの既存仕様と同じ（サインイン部屋主は全部屋、ゲスト部屋主は
 * その部屋のみ）で、チャットからの BAN と同じ `origin: MANUAL` の行を作る。
 */
export async function banPlayerInGameAction(
    playId: number,
    targetPlayerId: string,
): Promise<InGameBanResponse> {
    const auth = await authorize(playId, targetPlayerId);
    if (!auth.ok) {
        return { ok: false, reason: auth.reason };
    }
    const { user, scope, target } = auth;
    const banTarget = banTargetOf(target);

    const existing = await prisma.ban.findFirst({
        where: { ...scope, ...banTarget, origin: "MANUAL" },
        select: { id: true },
    });
    if (
        !existing &&
        user.authType === "oauth" &&
        (await countGmBans(user.id)) >= BAN_LIMIT
    ) {
        return { ok: false, reason: "LimitExceeded" };
    }

    const label = await buildLabel(playId, target);
    try {
        await archive({
            playId,
            action: "BAN",
            scope,
            target,
            applied: !existing,
        });
    } catch (err) {
        console.warn("failed to archive in-game ban request to S3", err);
        return { ok: false, reason: "InternalError" };
    }

    if (!existing) {
        try {
            await prisma.ban.create({
                data: { ...scope, ...banTarget, labelSnapshot: label },
            });
        } catch (err) {
            // 並走した BAN 発行が同一 BAN を先に作ると unique 制約違反(P2002)に
            // なる。既に BAN 済みなので冪等に成功扱いにして通知と kick へ進む
            const isDuplicate =
                typeof err === "object" &&
                err !== null &&
                "code" in err &&
                err.code === "P2002";
            if (!isDuplicate) {
                console.warn("failed to create ban", err);
                return { ok: false, reason: "InternalError" };
            }
        }
    }

    await applyBanChange({ scope, target, action: "banned" });
    return {
        ok: true,
        label,
        effective: true,
        undoToken: issueBanUndoToken(playId, target),
    };
}

/**
 * コンテンツからの要求で、部屋主が BAN を解除する。
 * VIA_BLOCK の BAN はブロック解除でのみ外れるべきなので、ゲームには触らせない。
 */
export async function unbanPlayerInGameAction(
    playId: number,
    targetPlayerId: string,
    undoToken?: string,
): Promise<InGameBanResponse> {
    const auth = await authorize(playId, targetPlayerId, undoToken);
    if (!auth.ok) {
        return { ok: false, reason: auth.reason };
    }
    const { scope, target } = auth;
    const banTarget = banTargetOf(target);
    const where = { ...scope, ...banTarget, origin: "MANUAL" as const };

    const existing = await prisma.ban.findFirst({
        where,
        select: { id: true, labelSnapshot: true },
    });
    try {
        await archive({
            playId,
            action: "UNBAN",
            scope,
            target,
            applied: !!existing,
        });
    } catch (err) {
        console.warn("failed to archive in-game unban request to S3", err);
        return { ok: false, reason: "InternalError" };
    }

    if (existing) {
        await prisma.ban.deleteMany({ where });
    }
    // MANUAL 以外の BAN（ブロック連動の VIA_BLOCK）は同じ発行者・対象で別行として
    // 残る。それを消さずに unbanned を配ると、コンテンツは進行へ戻すのに入室ガードは
    // 拒否し続け、ゲーム状態と実態がずれる。残っていれば通知しない。
    //
    // VIA_BLOCK を作る経路はまだ無い（ブロックは未着手）ので現状この分岐には
    // 入らないが、後から足すと入れ忘れて静かに壊れるため先に置く。
    const remaining = await prisma.ban.findFirst({
        where: { ...scope, ...banTarget },
        select: { id: true },
    });
    if (!remaining) {
        await applyBanChange({ scope, target, action: "unbanned" });
    }
    return {
        ok: true,
        label: existing?.labelSnapshot ?? (await buildLabel(playId, target)),
        effective: !remaining,
    };
}
