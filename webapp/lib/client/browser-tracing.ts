import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { AWSXRayPropagator } from "@opentelemetry/propagator-aws-xray";

let initialized = false;

/**
 * ブラウザの OpenTelemetry トレーシングを初期化する。
 *
 * fetch 計装により、プレイ起動時の HTTP 経路にスパンが張られる。伝播器を storage
 * と同じ AWSXRayPropagator に揃えているため、`propagateTraceHeaderCorsUrls` に
 * 一致する宛先（storage）への fetch には `X-Amzn-Trace-Id` が付与され、storage 側の
 * サーバースパン・Valkey スパンと 1 トレースに連結される。
 *
 * NOTE: tick ストリーム（WebSocket）はゲームループ中にアクティブなスパンが無いため
 * ここでは連結されない（詳細は OBSERVABILITY.md 参照）。
 *
 * 多重初期化・SSR を避けるためガードしている。`otlpEndpoint` が空なら何もしない。
 */
export const initBrowserTracing = (params: {
    otlpEndpoint: string;
    propagateTraceHeaderCorsUrls: (string | RegExp)[];
}): void => {
    if (initialized || typeof window === "undefined") {
        return;
    }
    if (!params.otlpEndpoint) {
        return;
    }
    initialized = true;

    const provider = new WebTracerProvider({
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: "webapp-browser",
        }),
        spanProcessors: [
            new BatchSpanProcessor(
                new OTLPTraceExporter({ url: params.otlpEndpoint }),
            ),
        ],
    });

    provider.register({
        contextManager: new ZoneContextManager(),
        propagator: new AWSXRayPropagator(),
    });

    registerInstrumentations({
        instrumentations: [
            new FetchInstrumentation({
                propagateTraceHeaderCorsUrls:
                    params.propagateTraceHeaderCorsUrls,
            }),
        ],
    });
};
