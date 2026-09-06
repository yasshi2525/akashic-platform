import { OAuthUser } from "../types";
import { getGuest } from "./auth-guest";
import { auth } from "./auth-next";

// 読み取り専用・nullable。Server Component を含めどの経路からでも呼べる。
// guest_id は proxy が全リクエストの入口で発行するため、実運用では
// 通常ゲストが載り非 null になる（型は保証しないので呼び出し側で null を扱う）。
export async function getAuth() {
    const session = await auth();
    if (session?.user?.id && session.user.name) {
        return {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image ?? undefined,
            authType: "oauth",
        } satisfies OAuthUser;
    }
    return await getGuest();
}
