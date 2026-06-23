import { NextRequest, NextResponse } from "next/server";
import { internalOtelExporterUrl } from "@/lib/server/akashic";

// protobuf バイナリをそのまま中継するため Node ランタイムで動かす。
export const runtime = "nodejs";
// トレースは毎リクエスト転送する。キャッシュさせない。
export const dynamic = "force-dynamic";

/**
 * 同一オリジン proxy（OBSERVABILITY.md「本番での選択肢 2」）。
 *
 * ブラウザは同一オリジンの `/api/otel/v1/traces` へ OTLP/HTTP(protobuf) を POST し、
 * このハンドラがサーバ側（docker / VPC 内）からのみ到達できる内部コレクタへ転送する。
 * 同一オリジンのため CORS 不要で、コレクタを公開せずに済む。
 *
 * `INTERNAL_OTEL_EXPORTER_OTLP_ENDPOINT` が未設定の場合は 204 を返し、ブラウザ側の
 * 無駄なリトライ・エラーログを避ける（計装は実質 no-op になる）。
 */
export async function POST(req: NextRequest) {
    if (!internalOtelExporterUrl) {
        return new NextResponse(null, { status: 204 });
    }

    const body = await req.arrayBuffer();
    const contentType =
        req.headers.get("content-type") ?? "application/x-protobuf";
    const contentEncoding = req.headers.get("content-encoding");

    const headers: Record<string, string> = { "content-type": contentType };
    if (contentEncoding) {
        headers["content-encoding"] = contentEncoding;
    }

    try {
        const upstream = await fetch(internalOtelExporterUrl, {
            method: "POST",
            headers,
            body,
            cache: "no-store",
        });
        const respBody = await upstream.arrayBuffer();
        return new NextResponse(respBody, {
            status: upstream.status,
            headers: {
                "content-type":
                    upstream.headers.get("content-type") ??
                    "application/x-protobuf",
                "cache-control": "no-store",
            },
        });
    } catch {
        return NextResponse.json(
            { ok: false, reason: "UpstreamUnreachable" },
            { status: 502, headers: { "cache-control": "no-store" } },
        );
    }
}
