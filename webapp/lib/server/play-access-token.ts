import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

// 入室審査を通過したことの証明。限定部屋のチャットは合言葉を毎回送らせず、
// この Cookie のみで判定する
const TTL_MS = 6 * 60 * 60 * 1000;

function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET is required.");
    }
    return secret;
}

function sign(payload: string) {
    // next-auth の JWT と鍵素材を共有しないようラベルで分離する
    return createHmac("sha256", `play-access:${getSecret()}`)
        .update(payload)
        .digest("base64url");
}

const COOKIE_PREFIX = "play_access_";

export function playAccessCookieName(playId: number) {
    return `${COOKIE_PREFIX}${playId}`;
}

export function issuePlayAccessToken(playId: number, viewerId: string) {
    const expiresAt = Date.now() + TTL_MS;
    const payload = `${playId}.${viewerId}.${expiresAt}`;
    return `${expiresAt}.${sign(payload)}`;
}

export function verifyPlayAccessToken(
    token: string | undefined,
    playId: number,
    viewerId: string,
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
    const expected = sign(`${playId}.${viewerId}.${expiresAt}`);
    const actualBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length) {
        return false;
    }
    return timingSafeEqual(actualBuf, expectedBuf);
}

export function setPlayAccessCookie(
    res: NextResponse,
    playId: number,
    viewerId: string,
    existing?: { name: string; value: string }[],
) {
    for (const cookie of existing ?? []) {
        if (!cookie.name.startsWith(COOKIE_PREFIX)) {
            continue;
        }
        const target = Number(cookie.name.slice(COOKIE_PREFIX.length));
        if (
            target !== playId &&
            !verifyPlayAccessToken(cookie.value, target, viewerId)
        ) {
            res.cookies.delete(cookie.name);
        }
    }
    res.cookies.set(
        playAccessCookieName(playId),
        issuePlayAccessToken(playId, viewerId),
        {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: TTL_MS / 1000,
        },
    );
}

export async function hasPlayAccess(playId: number, viewerId: string) {
    const store = await cookies();
    return verifyPlayAccessToken(
        store.get(playAccessCookieName(playId))?.value,
        playId,
        viewerId,
    );
}
