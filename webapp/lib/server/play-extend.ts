"use server";

import { akashicServerUrl } from "./akashic";

const errReasons = ["InvalidParams", "InternalError", "NotFound"] as const;
export type ExtendPlayErrorType = (typeof errReasons)[number];

export type ExtendPlayResponse =
    | {
          ok: true;
          remainingMs: number;
          expiresAt: number;
          extendMs: number;
      }
    | {
          ok: false;
          reason: ExtendPlayErrorType | "TooEarly";
          remainingMs?: number;
          expiresAt?: number;
      };

export async function extendPlay({
    playId,
}: {
    playId: string;
}): Promise<ExtendPlayResponse> {
    if (!playId) {
        return {
            ok: false,
            reason: "InvalidParams",
        };
    }
    try {
        const res = await fetch(`${akashicServerUrl}/extend`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ playId }),
        });
        if (res.status === 404) {
            return { ok: false, reason: "NotFound" };
        }
        const json = await res.json();
        if (res.status === 409) {
            return json as ExtendPlayResponse;
        }
        if (res.status !== 200) {
            return { ok: false, reason: "InternalError" };
        }
        return json as ExtendPlayResponse;
    } catch (err) {
        console.warn(`failed to extend. (playId = "${playId}")`, err);
        return { ok: false, reason: "InternalError" };
    }
}
