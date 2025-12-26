import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Guest, GUEST_IDKEY, GUEST_NAME } from "@/lib/types";

export async function POST() {
    const store = await cookies();
    let guestId = store.get(GUEST_IDKEY)?.value;
    if (!guestId) {
        guestId = randomUUID();
        store.set(GUEST_IDKEY, guestId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
        });
    }
    return NextResponse.json({
        id: guestId,
        name: GUEST_NAME,
        authType: "guest",
    } satisfies Guest);
}
