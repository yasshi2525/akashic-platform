import { getGuest } from "./auth-guest";

export async function getAuth() {
    return await getGuest();
}
