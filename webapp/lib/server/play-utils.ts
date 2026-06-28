"use server";

import type { GameConfiguration } from "@akashic/game-configuration";
import {
    akashicServerUrl,
    internalContentBaseUrl,
    internalPlaylogServerUrl,
    withAkashicServerAuth,
} from "./akashic";

export async function fetchPlayToken(playId: number, contentId: number) {
    const res = await fetch(
        `${internalPlaylogServerUrl}/join?playId=${playId}`,
    );
    if (res.status !== 200) {
        throw new Error(
            `playlog server responded error message. (contentId = "${contentId}", detail = "${await res.text()}")`,
        );
    }
    const json = (await res.json()) as { playToken: string };
    if (!json.playToken) {
        throw new Error(
            `playlog server responded invalid message. (contentId = "${contentId}", detail = "${json}")`,
        );
    }
    return json.playToken;
}

export async function checkLimitedPlayAccess(
    play: {
        isLimited: boolean;
        gameMasterId: string;
        joinWord?: string | null;
        inviteHash?: string | null;
    },
    userId: string | undefined,
    input: {
        joinWord?: string;
        inviteHash?: string;
    },
): Promise<{
    ok: false;
    reason: "JoinWordRequired" | "InvalidJoinWord";
} | null> {
    if (!play.isLimited) {
        return null;
    }
    if (userId === play.gameMasterId) {
        return null;
    }
    if (
        input.inviteHash !== undefined &&
        input.inviteHash === play.inviteHash
    ) {
        return null;
    }
    if (!input.joinWord) {
        return {
            ok: false,
            reason: "JoinWordRequired",
        };
    }
    if (input.joinWord !== play.joinWord) {
        return {
            ok: false,
            reason: "InvalidJoinWord",
        };
    }
    return null;
}

export async function fetchPlayRemaining(playId: number) {
    const res = await fetch(`${akashicServerUrl}/remaining?playId=${playId}`, {
        headers: withAkashicServerAuth(),
    });
    // 終了済みの場合と他のエラーを区別。
    // 終了直後は DB isActive = true で、終了した部屋に関する問い合わせがくるため
    if (res.status === 404) {
        return null;
    }
    if (res.status !== 200) {
        throw new Error(
            `akashic server /remaining responded error. (playId = "${playId}", detail = "${await res.text()}")`,
        );
    }
    return (await res.json()) as {
        remainingMs: number;
        expiresAt: number;
    };
}

export async function fetchGameJson(contentId: number) {
    return (await (
        await fetch(`${internalContentBaseUrl}/${contentId}/game.json`)
    ).json()) as GameConfiguration;
}

export async function getContentViewSize(gameJson: GameConfiguration) {
    return {
        width: gameJson.width ?? 1280,
        height: gameJson.height ?? 720,
    };
}
