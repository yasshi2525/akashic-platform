"use client";

import { useEffect } from "react";
import { initBrowserTracing } from "@/lib/client/browser-tracing";

/**
 * ブラウザのトレーシングをクライアント側で一度だけ初期化する。
 * 描画には影響しないため何もレンダリングしない。
 */
export function TracingProvider({
    otlpEndpoint,
    storageUrl,
}: {
    otlpEndpoint: string;
    storageUrl: string;
}) {
    useEffect(() => {
        initBrowserTracing({
            otlpEndpoint,
            // storage への fetch にのみ trace ヘッダを付与する（第三者への漏洩防止）
            propagateTraceHeaderCorsUrls: storageUrl ? [storageUrl] : [],
        });
    }, [otlpEndpoint, storageUrl]);
    return null;
}
