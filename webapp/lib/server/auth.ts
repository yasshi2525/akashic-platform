import { OAuthUser } from "../types";
import { getGuest } from "./auth-guest";
import { auth } from "./auth-next";

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
