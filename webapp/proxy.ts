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
    const existing = req.cookies.get(GUEST_IDKEY)?.value;
    const guestId = existing ?? crypto.randomUUID();
    let res: NextResponse;
    if (existing) {
        res = NextResponse.next();
    } else {
        // 新規発行時は、同一リクエストの下流（getAuth 等）がこの guest_id を
        // 読めるよう request の cookie を書き換え、更新後のヘッダを転送する
        // （Next.js 公式パターン）
        req.cookies.set(GUEST_IDKEY, guestId);
        res = NextResponse.next({ request: { headers: req.headers } });
    }
    // 毎リクエストで maxAge を再設定してスライド期限にする。固定期限だと能動利用
    // 中でも失効し、新 guest_id 発行で local-mute の匿名キーが総入れ替えになる
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
