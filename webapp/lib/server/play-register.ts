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
import { isWriteBlocked } from "./drain-state";

interface PlayForm {
    gameMasterId: string;
    gmUserId: string | undefined;
    contentId: number;
    playName: string;
    isLimited: boolean;
    joinWord?: string;
}

const errReasons = ["InvalidParams", "Drain", "InternalError"] as const;
export type RegisterPlayErrorType = (typeof errReasons)[number];
type RegisterPlayResponse =
    | { ok: true; playId: number }
    | { ok: false; reason: RegisterPlayErrorType };

export async function registerPlay({
    gameMasterId,
    gmUserId,
    contentId,
    playName,
    isLimited,
    joinWord,
}: PlayForm): Promise<RegisterPlayResponse> {
    if (isWriteBlocked()) {
        return {
            ok: false,
            reason: "Drain",
        };
    }
    if (!gameMasterId || contentId == null) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    const normalizedJoinWord = joinWord?.trim();
    if (isLimited && !normalizedJoinWord) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
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
                joinWordHash:
                    isLimited && normalizedJoinWord
                        ? createHash("sha256")
                              .update(normalizedJoinWord)
                              .digest("hex")
                        : undefined,
                inviteHash: isLimited
                    ? randomBytes(24).toString("hex")
                    : undefined,
            }),
        });
        if (res.status !== 200) {
            console.warn(
                `failed to start play. (contentId = "${contentId}", cause = ${await res.text()})`,
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
            };
        }
    } catch (err) {
        console.warn(`failed to start play. (contentId = "${contentId}"`, err);
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
