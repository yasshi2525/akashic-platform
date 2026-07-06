import { PassThrough, Readable } from "node:stream";
import type {
    AssetRequest,
    PlayEndedRequest,
} from "@yasshi2525/runner-ipc-schema";

export class ControlClient {
    _baseUrl: string;
    _token: string;

    constructor(baseUrl: string, token: string) {
        this._baseUrl = baseUrl;
        this._token = token;
    }

    async fetchAsset(
        playId: number,
        url: string,
        encoding: "utf-8" | "uint8array",
    ): Promise<string | Uint8Array> {
        const res = await fetch(`${this._baseUrl}/internal/asset`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-akashic-internal-token": this._token,
            },
            body: JSON.stringify({ playId, url } satisfies AssetRequest),
        });
        if (res.status !== 200) {
            throw new Error(
                `asset proxy failed (status = ${res.status}, url = "${url}")`,
            );
        }
        if (encoding === "uint8array") {
            return new Uint8Array(await res.arrayBuffer());
        }
        return await res.text();
    }

    openLogStream(playId: number) {
        const stream = new PassThrough();
        fetch(`${this._baseUrl}/internal/logs?playId=${playId}`, {
            method: "POST",
            headers: {
                "content-type": "application/x-ndjson",
                "x-akashic-internal-token": this._token,
            },
            body: Readable.toWeb(stream) as ReadableStream,
            duplex: "half",
        } as RequestInit & { duplex: "half" }).catch((err) => {
            console.warn(
                "failed to stream logs to control (playId = %s)",
                playId,
                err,
            );
        });
        return stream;
    }

    async reportPlayEnded(payload: PlayEndedRequest) {
        const res = await fetch(`${this._baseUrl}/internal/play-ended`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-akashic-internal-token": this._token,
            },
            body: JSON.stringify(payload),
        });
        if (res.status !== 200) {
            console.warn("failed to report play-ended", {
                playId: payload.playId,
                status: res.status,
            });
        }
    }
}
