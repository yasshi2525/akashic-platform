import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

// ゲスト部屋主が「その部屋の作成者本人」であることの証明。ゲストの gameMasterId
// (=guest_id) は in-game の playerId として参加者へ配られ公開されるため、認可の
// 資格情報には使えない。部屋作成時にだけ発行する署名 Cookie で、ID を知っただけの
// 参加者と作成者本人を区別する。OAuth 部屋主はセッション自体が詐称不能なので不要。
const TTL_MS = 12 * 60 * 60 * 1000;

function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET is required.");
    }
    return secret;
}

function sign(payload: string) {
    // next-auth の JWT や他の Cookie と鍵素材を共有しないようラベルで分離する
    return createHmac("sha256", `play-owner:${getSecret()}`)
        .update(payload)
        .digest("base64url");
}

const COOKIE_PREFIX = "play_owner_";

export function playOwnerCookieName(playId: number) {
    return `${COOKIE_PREFIX}${playId}`;
}

function issue(playId: number, ownerId: string) {
    const expiresAt = Date.now() + TTL_MS;
    return `${expiresAt}.${sign(`${playId}.${ownerId}.${expiresAt}`)}`;
}

export function verifyPlayOwnerToken(
    token: string | undefined,
    playId: number,
    ownerId: string,
) {
    if (!token) {
        return false;
    }
    const separator = token.indexOf(".");
    if (separator < 0) {
        return false;
    }
    const expiresAt = Number(token.slice(0, separator));
    const signature = token.slice(separator + 1);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
        return false;
    }
    const expected = sign(`${playId}.${ownerId}.${expiresAt}`);
    const actualBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length) {
        return false;
    }
    return timingSafeEqual(actualBuf, expectedBuf);
}

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_MS / 1000,
};

/** 部屋作成時（server action）に作成者へ owner 資格を付与する */
export async function grantPlayOwner(playId: number, ownerId: string) {
    const store = await cookies();
    store.set(
        playOwnerCookieName(playId),
        issue(playId, ownerId),
        cookieOptions,
    );
}

/** 入室応答（route handler）で owner 資格の期限を延長する */
export function refreshPlayOwnerCookie(
    res: NextResponse,
    playId: number,
    ownerId: string,
) {
    res.cookies.set(
        playOwnerCookieName(playId),
        issue(playId, ownerId),
        cookieOptions,
    );
}
