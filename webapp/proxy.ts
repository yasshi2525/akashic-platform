import { NextRequest, NextResponse } from "next/server";
import { GUEST_COOKIE_MAX_AGE, GUEST_IDKEY } from "@/lib/types";

/**
 * ゲスト識別子の発行を全リクエストの入口で1回だけ行う唯一の場所。
 * cookie を書けるのは Server Action / Route Handler / proxy だけで、
 * proxy は SC より前に走り request/response 両方へ cookie を載せられる。
 * ここで発行しておけば、以降どの経路（SC 含む）でも guest_id が必ず読め、
 * 発行元が複数になって別々の UUID が競合する事故を防げる。
 */
export function proxy(req: NextRequest) {
    if (req.cookies.get(GUEST_IDKEY)) {
        return NextResponse.next();
    }
    const guestId = crypto.randomUUID();
    // 同一リクエストの下流（getAuth 等）がこの guest_id を読めるよう、request の
    // cookie を書き換え、更新後のヘッダを転送する（Next.js 公式パターン）
    req.cookies.set(GUEST_IDKEY, guestId);
    const res = NextResponse.next({ request: { headers: req.headers } });
    res.cookies.set(GUEST_IDKEY, guestId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: GUEST_COOKIE_MAX_AGE,
    });
    return res;
}

export const config = {
    // 純アセットを除く全ページ・全 API を対象にする
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
