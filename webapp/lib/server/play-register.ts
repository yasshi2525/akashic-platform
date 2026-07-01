"use server";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@yasshi2525/persist-schema";
import { GUEST_NAME } from "../types";
import {
    akashicServerUrl,
    internalBaseUrl,
    internalContentBaseUrl,
    withAkashicServerAuth,
} from "./akashic";
import { getAuth } from "./auth";
import { isWriteBlocked } from "./drain-state";

interface PlayForm {
    contentId: number;
    playName: string;
    isLimited: boolean;
    joinWord?: string;
    requireSignIn: boolean;
}

const errReasons = [
    "InvalidParams",
    "Drain",
    "GuestRoomLimitExceeded",
    "InternalError",
] as const;
export type RegisterPlayErrorType = (typeof errReasons)[number];
type RegisterPlayResponse =
    | { ok: true; playId: number; inviteHash?: string }
    | { ok: false; reason: RegisterPlayErrorType };

const GUEST_ROOM_LIMIT = parseInt(process.env.GUEST_ROOM_LIMIT ?? "5");

export async function registerPlay({
    contentId,
    playName,
    isLimited,
    joinWord,
    requireSignIn,
}: PlayForm): Promise<RegisterPlayResponse> {
    if (isWriteBlocked()) {
        return {
            ok: false,
            reason: "Drain",
        };
    }
    const auth = await getAuth();
    if (!auth || contentId == null) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    const gameMasterId = auth.id;
    const gmUserId = auth.authType === "oauth" ? auth.id : undefined;
    if (isLimited && !joinWord) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    if (requireSignIn && !gmUserId) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    if (!gmUserId) {
        const guestPlayCount = await prisma.play.count({
            where: {
                gameMasterId,
                gmUserId: null,
                isActive: true,
            },
        });
        if (guestPlayCount >= GUEST_ROOM_LIMIT) {
            return {
                ok: false,
                reason: "GuestRoomLimitExceeded",
            };
        }
    }
    try {
        const playerName =
            (gmUserId
                ? (
                      await prisma.user.findUnique({
                          where: {
                              id: gmUserId,
                          },
                      })
                  )?.name
                : undefined) ?? GUEST_NAME;
        const inviteHash = isLimited
            ? randomBytes(12).toString("hex")
            : undefined;
        const res = await fetch(`${akashicServerUrl}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...withAkashicServerAuth(),
            },
            body: JSON.stringify({
                contentId,
                contentUrl: `${internalBaseUrl}/api/internal/content/${contentId}`,
                assetBaseUrl: `${internalContentBaseUrl}/${contentId}`,
                configurationUrl: `${internalContentBaseUrl}/${contentId}/game.json`,
                playerId: gameMasterId,
                playerUserId: gmUserId,
                playerName,
                playName: !!playName
                    ? playName
                    : await fetchDefaultPlayName(contentId),
                isLimited,
                joinWord: isLimited ? joinWord : undefined,
                inviteHash,
                requireSignIn,
            }),
        });
        if (res.status !== 200) {
            console.warn(
                'failed to start play. (contentId = "%s", cause = %s)',
                contentId,
                await res.text(),
            );
            return {
                ok: false,
                reason: "InternalError",
            };
        } else {
            const { playId } = (await res.json()) as { playId: number };
            await incrementPlayCount(contentId);
            return {
                ok: true,
                playId,
                inviteHash,
            };
        }
    } catch (err) {
        console.warn(
            'failed to start play. (contentId = "%s")',
            contentId,
            err,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    }
}

async function fetchDefaultPlayName(contentId: number) {
    const title = (
        await prisma.content.findUniqueOrThrow({
            select: {
                game: {
                    select: {
                        title: true,
                    },
                },
            },
            where: {
                id: contentId,
            },
        })
    ).game.title;
    return `「${title}」で遊ぼう！`;
}

async function incrementPlayCount(contentId: number) {
    await prisma.game.updateMany({
        data: {
            playCount: {
                increment: 1,
            },
        },
        where: {
            versions: {
                some: {
                    id: contentId,
                },
            },
        },
    });
}
