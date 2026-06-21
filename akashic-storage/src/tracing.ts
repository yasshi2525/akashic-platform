import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { SocketIoInstrumentation } from "@opentelemetry/instrumentation-socket.io";
import { AWSXRayPropagator } from "@opentelemetry/propagator-aws-xray";
import { AWSXRayIdGenerator } from "@opentelemetry/id-generator-aws-xray";
import { CompositePropagator, W3CBaggagePropagator } from "@opentelemetry/core";

/**
 * OpenTelemetry のトレーシングを初期化する。
 *
 * このモジュールは計装対象（http / express / socket.io 等）が require される前に
 * 読み込む必要があるため、index.ts の最上段で `import "./tracing";` と副作用
 * import し、本関数はモジュール末尾で即時実行している。
 *
 * トレースは OTLP/gRPC で ADOT Collector（既定で localhost:4317 のサイドカー）へ
 * 送信し、Collector 側で AWS X-Ray に変換・転送する。
 * X-Ray 互換にするため ID 生成器と伝播器を X-Ray 用に差し替えている。
 *
 * 環境変数 OTEL_SDK_DISABLED=true で無効化できる。
 * エクスポート先は OTEL_EXPORTER_OTLP_ENDPOINT で上書きできる。
 */
export const startTracing = (): void => {
    if (process.env.OTEL_SDK_DISABLED?.toLowerCase() === "true") {
        return;
    }

    const sdk = new NodeSDK({
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]:
                process.env.OTEL_SERVICE_NAME ?? "akashic-storage",
        }),
        traceExporter: new OTLPTraceExporter(),
        // X-Ray のトレース ID 形式（先頭8桁が epoch 秒）に合わせる
        idGenerator: new AWSXRayIdGenerator(),
        // X-Ray のトレースコンテキストに加え、Baggage（play.id / content.id 等の
        // 横断的な識別子）も伝播・抽出できるよう合成する。
        textMapPropagator: new CompositePropagator({
            propagators: [new AWSXRayPropagator(), new W3CBaggagePropagator()],
        }),
        instrumentations: [
            new HttpInstrumentation(),
            new ExpressInstrumentation(),
            new SocketIoInstrumentation({
                // connection スパンが巨大化するのを避け、emit/on を個別スパンにする
                traceReserved: false,
            }),
        ],
    });

    sdk.start();

    const shutdown = () => {
        sdk.shutdown().catch((err) => {
            // eslint-disable-next-line no-console
            console.error("failed to shutdown OpenTelemetry SDK", err);
        });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

startTracing();
