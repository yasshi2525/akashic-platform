"use server";

import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { akashicServerUrl, withAkashicServerAuth } from "./akashic";

const errReasons = ["InvalidParams", "InternalError"] as const;
type EndPlayErrorType = (typeof errReasons)[number];
type EndPlayResponse = { ok: true } | { ok: false; reason: EndPlayErrorType };

export async function endPlay({
    playId,
    reason,
}: {
    playId: string;
    reason: PlayEndReason;
}): Promise<EndPlayResponse> {
    if (!playId) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    const res = await fetch(
        `${akashicServerUrl}/end?playId=${playId}&reason=${reason}`,
        {
            headers: withAkashicServerAuth(),
        },
    );
    if (res.status !== 200) {
        console.warn(
            `failed to end. (playId = "${playId}", cause = "${await res.text()}")`,
        );
        return {
            ok: false,
            reason: "InternalError",
        };
    } else {
        return {
            ok: true,
        };
    }
}
