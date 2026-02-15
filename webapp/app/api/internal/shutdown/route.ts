import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
    getShutdownState,
    registerRequestId,
    setShutdownState,
} from "@/lib/server/shutdown-state";

const MAX_SKEW_MS = 60 * 1000;
const REQUEST_ID_TTL_MS = 5 * 60 * 1000;

function noStoreJson(body: unknown, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

export async function GET() {
    return noStoreJson({
        ok: true,
        ...getShutdownState(),
    });
}

function verifySignature({
    secret,
    timestamp,
    rawBody,
    signature,
}: {
    secret: string;
    timestamp: string;
    rawBody: string;
    signature: string;
}) {
    const expected = createHmac("sha256", secret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
    const actualBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (actualBuf.length !== expectedBuf.length) {
        return false;
    }
    return timingSafeEqual(actualBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
    const secret = process.env.SHUTDOWN_HMAC_SECRET;
    if (!secret) {
        return noStoreJson(
            {
                ok: false,
                reason: "ServerMisconfigured",
            },
            500,
        );
    }

    const timestamp = req.headers.get("x-shutdown-timestamp");
    const signature = req.headers.get("x-shutdown-signature");
    const requestId = req.headers.get("x-shutdown-id");
    if (!timestamp || !signature || !requestId) {
        return noStoreJson(
            {
                ok: false,
                reason: "MissingHeaders",
            },
            401,
        );
    }

    const timestampMs = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(timestampMs)) {
        return noStoreJson(
            {
                ok: false,
                reason: "InvalidTimestamp",
            },
            401,
        );
    }
    if (Math.abs(Date.now() - timestampMs) > MAX_SKEW_MS) {
        return noStoreJson(
            {
                ok: false,
                reason: "ExpiredTimestamp",
            },
            401,
        );
    }
    const rawBody = await req.text();
    const verified = verifySignature({
        secret,
        timestamp,
        rawBody,
        signature,
    });
    if (!verified) {
        return noStoreJson(
            {
                ok: false,
                reason: "InvalidSignature",
            },
            401,
        );
    }
    if (
        !registerRequestId({
            requestId,
            nowMs: Date.now(),
            ttlMs: REQUEST_ID_TTL_MS,
        })
    ) {
        return noStoreJson(
            {
                ok: false,
                reason: "ReplayDetected",
            },
            401,
        );
    }

    let body: { enabled?: boolean; reason?: string };
    try {
        body = JSON.parse(rawBody) as { enabled?: boolean; reason?: string };
    } catch {
        return noStoreJson(
            {
                ok: false,
                reason: "InvalidBody",
            },
            400,
        );
    }
    if (typeof body.enabled !== "boolean") {
        return noStoreJson(
            {
                ok: false,
                reason: "InvalidBody",
            },
            400,
        );
    }

    setShutdownState({
        enabled: body.enabled,
        reason: body.reason,
    });
    return noStoreJson({
        ok: true,
        ...getShutdownState(),
    });
}
