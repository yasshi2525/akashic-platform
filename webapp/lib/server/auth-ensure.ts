import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Guest, GUEST_IDKEY, GUEST_NAME } from "../types";
import { GUEST_COOKIE_MAX_AGE } from "./auth-guest";
import { getAuth } from "./auth";

/**
 * cookie を書き込む認証ヘルパ。**Server Action / Route Handler 専用**。
 * Server Component から呼ぶと Next.js の仕様で `cookies().set()` が throw する
 * （Cookies can only be modified in a Server Action or Route Handler）。
 * 読み取りだけで良い経路は nullable な getAuth / getGuest を使うこと。
 */

/**
 * guest_id が無ければ発行して Cookie に載せる。身元不明のまま playToken を
 * 発行すると、その token が PlaySession に紐づかず追跡・kick 不能になるため、
 * 入室系はトークン発行前にこれで identity を確定させる。
 */
export async function ensureGuest(): Promise<Guest> {
    const store = await cookies();
    const existing = store.get(GUEST_IDKEY)?.value;
    const guestId = existing ?? randomUUID();
    if (!existing) {
        store.set(GUEST_IDKEY, guestId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: GUEST_COOKIE_MAX_AGE,
        });
    }
    return { id: guestId, name: GUEST_NAME, authType: "guest" };
}

/**
 * getAuth と同じだが、身元が無ければゲストを発行して必ず非 null を返す。
 * playToken を発行する入室系で、追跡不能な token を作らないために使う。
 */
export async function getAuthEnsuringGuest(): Promise<
    NonNullable<Awaited<ReturnType<typeof getAuth>>>
> {
    return (await getAuth()) ?? (await ensureGuest());
}
