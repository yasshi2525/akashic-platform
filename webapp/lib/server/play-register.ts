"use server";

import { GUEST_NAME } from "../types";
import { prisma } from "./prisma";
import { akashicServerUrl, publicBaseUrl } from "./akashic";

interface PlayForm {
    gameMasterId: string;
    contentId: number;
}

const errReasons = ["InvalidParams", "InternalError"] as const;
export type RegisterPlayErrorType = (typeof errReasons)[number];
type RegisterPlayResponse =
    | { ok: true; playId: number }
    | { ok: false; reason: RegisterPlayErrorType };

export async function registerPlay({
    gameMasterId,
    contentId,
}: PlayForm): Promise<RegisterPlayResponse> {
    if (!gameMasterId || contentId == null) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    try {
        const playId = (
            await prisma.play.create({
                data: {
                    contentId,
                    gameMasterId,
                },
            })
        ).id;
        const playerName =
            (
                await prisma.user.findUnique({
                    where: {
                        id: gameMasterId,
                    },
                })
            )?.name ?? GUEST_NAME;
        const res = await fetch(`${akashicServerUrl}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                playId,
                contentUrl: `${publicBaseUrl}/api/content/${contentId}`,
                assetBaseUrl: `${publicBaseUrl}/content/${contentId}`,
                configurationUrl: `${publicBaseUrl}/content/${contentId}/game.json`,
                playerId: gameMasterId,
                playerName: playerName,
            }),
        });
        if (res.status !== 200) {
            console.warn(
                `failed to start play "${playId}". (contentId = "${contentId}", cause = ${await res.text()})`,
            );
            return {
                ok: false,
                reason: "InternalError",
            };
        } else {
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
