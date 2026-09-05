import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Guest, GUEST_IDKEY, GUEST_NAME } from "@/lib/types";
import { GUEST_COOKIE_MAX_AGE } from "@/lib/server/auth-guest";

export async function POST() {
    const store = await cookies();
    const guestId = store.get(GUEST_IDKEY)?.value ?? randomUUID();
    // 既存のセッション Cookie も maxAge 付きで再設定して永続化・期限スライドする
    store.set(GUEST_IDKEY, guestId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: GUEST_COOKIE_MAX_AGE,
    });
    return NextResponse.json({
        id: guestId,
        name: GUEST_NAME,
        authType: "guest",
    } satisfies Guest);
}
