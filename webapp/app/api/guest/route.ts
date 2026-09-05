import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Guest, GUEST_IDKEY, GUEST_NAME } from "@/lib/types";

// 端末永続の識別子にする。セッション Cookie だとブラウザを閉じるたびに
// guest_id が変わり、端末内ミュートの匿名キー（guest_id 由来）が全て変わって
// 既存ミュートが失効しつつ上限枠だけ食い続ける
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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
