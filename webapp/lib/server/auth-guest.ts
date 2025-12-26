import { cookies } from "next/headers";
import { Guest, GUEST_IDKEY, GUEST_NAME } from "../types";

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
