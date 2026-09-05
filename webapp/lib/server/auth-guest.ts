import { cookies } from "next/headers";
import { Guest, GUEST_IDKEY, GUEST_NAME } from "../types";

// 端末永続の識別子にする。セッション Cookie だと閉じるたびに guest_id が変わり、
// 端末内ミュートの匿名キーが全て変わってしまう
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getGuest() {
    const store = await cookies();
    const guestId = store.get(GUEST_IDKEY)?.value;
    if (!guestId) {
        return null;
    }
    return {
        id: guestId,
        name: GUEST_NAME,
        authType: "guest",
    } satisfies Guest;
}
