"use server";

import { prisma } from "@yasshi2525/persist-schema";
import { getAuth } from "./auth";
import { buildBanLabel } from "./ban";
import { kickViewerFromPlays } from "./play-kick";

export type BanFormState = {
    ok: boolean;
    message?: string;
    submitted: boolean;
    submittedAt?: number;
};

function failure(message: string): BanFormState {
    return { ok: false, message, submitted: true, submittedAt: Date.now() };
}

function success(): BanFormState {
    return { ok: true, submitted: true, submittedAt: Date.now() };
}

/**
 * 部屋主が、自分の部屋のチャット発言者をBAN (BAN) する。
 * サインイン部屋主は自分の全部屋、ゲスト部屋主はその部屋のみに効く。
 */
export async function banFromChatAction(
    prevState: BanFormState,
    formData: FormData,
): Promise<BanFormState> {
    const playId = parseInt(formData.get("playId")?.toString() ?? "");
    const messageId = parseInt(formData.get("messageId")?.toString() ?? "");
    if (!Number.isSafeInteger(playId) || !Number.isSafeInteger(messageId)) {
        return failure("入力内容を確認してください。");
    }

    const user = await getAuth();
    if (!user) {
        return failure("ページを更新してから再度お試しください。");
    }

    const play = await prisma.play.findUnique({
        where: { id: playId },
        select: { id: true, gameMasterId: true, gmUserId: true },
    });
    if (!play) {
        return failure("部屋が見つかりませんでした。");
    }
    // 部屋主本人だけがBANできる（gameMasterId は作成者の userId/guestId）
    if (play.gameMasterId !== user.id) {
        return failure("この部屋の部屋主のみがBANできます。");
    }

    const message = await prisma.playChatMessage.findUnique({
        where: { id: messageId },
        select: {
            playId: true,
            authorId: true,
            authorName: true,
            guestId: true,
            body: true,
        },
    });
    if (!message || message.playId !== playId) {
        return failure("対象の発言が見つかりませんでした。");
    }
    if (!message.authorId && !message.guestId) {
        return failure("この発言者はBANできません。");
    }

    const target = message.authorId
        ? { targetUserId: message.authorId }
        : { targetGuestId: message.guestId };
    const targetViewerId = message.authorId ?? message.guestId!;
    // ゲスト部屋主の発言は guestId のみを持つため、authorId だけでは
    // 自分自身の判定が漏れる
    if (targetViewerId === user.id) {
        return failure("自分自身はBANできません。");
    }

    // サインイン部屋主は全部屋 (playId=null)、ゲスト部屋主はこの部屋のみ
    const scope =
        user.authType === "oauth"
            ? { gmUserId: user.id, playId: null }
            : { gmGuestId: user.id, playId: play.id };

    const existing = await prisma.ban.findFirst({
        where: { ...scope, ...target, origin: "MANUAL" },
        select: { id: true },
    });
    if (!existing) {
        try {
            await prisma.ban.create({
                data: {
                    ...scope,
                    ...target,
                    labelSnapshot: buildBanLabel(
                        message.authorName,
                        message.body,
                    ),
                },
            });
        } catch (err) {
            console.warn("failed to create ban", err);
            return failure(
                "予期しないエラーが発生しました。時間をおいてリトライしてください。",
            );
        }
    }

    // 即時切断する部屋の範囲を決める
    const playIds =
        user.authType === "oauth"
            ? (
                  await prisma.play.findMany({
                      where: { gmUserId: user.id, isActive: true },
                      select: { id: true },
                  })
              ).map((p) => p.id)
            : [play.id];
    await kickViewerFromPlays(playIds, targetViewerId);

    return success();
}

export async function unbanAction(
    prevState: BanFormState,
    formData: FormData,
): Promise<BanFormState> {
    const banId = parseInt(formData.get("banId")?.toString() ?? "");
    if (!Number.isSafeInteger(banId)) {
        return failure("入力内容を確認してください。");
    }
    const user = await getAuth();
    if (!user) {
        return failure("ページを更新してから再度お試しください。");
    }
    // 自分が発行した BAN のみ解除できる
    const owner =
        user.authType === "oauth"
            ? { gmUserId: user.id }
            : { gmGuestId: user.id };
    const { count } = await prisma.ban.deleteMany({
        where: { id: banId, ...owner },
    });
    if (count === 0) {
        return failure("対象のBANが見つかりませんでした。");
    }
    return success();
}
