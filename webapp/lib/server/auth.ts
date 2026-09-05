import { OAuthUser } from "../types";
import { getGuest } from "./auth-guest";
import { auth } from "./auth-next";

// 読み取り専用・nullable。Server Component を含めどの経路からでも呼べる。
// ゲストを新規発行して必ず非 null を返したい入室系は auth-ensure.ts の
// getAuthEnsuringGuest を使う（cookie を書くため SA/RH 専用）。
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
