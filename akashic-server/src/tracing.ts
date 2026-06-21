import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { AWSXRayPropagator } from "@opentelemetry/propagator-aws-xray";
import { AWSXRayIdGenerator } from "@opentelemetry/id-generator-aws-xray";
import { CompositePropagator, W3CBaggagePropagator } from "@opentelemetry/core";

/**
 * akashic-server 用の OpenTelemetry トレーシング初期化。
 *
 * akashic-server は Socket.IO クライアントとして akashic-storage に接続する。
 * このモジュールを index.ts 最上段で `import "./tracing";` すると、HTTP/Express の
 * 自動計装に加え、X-Ray 互換の伝播器がグローバルに設定される。これにより
 * AMFlowClient が emit 時に現在の trace context を carrier へ inject できるようになり、
 * storage 側のサーバースパン・Valkey スパンと 1 トレースに連結される。
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
                process.env.OTEL_SERVICE_NAME ?? "akashic-server",
        }),
        traceExporter: new OTLPTraceExporter(),
        idGenerator: new AWSXRayIdGenerator(),
        // X-Ray のトレースコンテキストに加え、Baggage（play.id / content.id）も
        // emit 時に carrier へ inject できるよう合成する。
        textMapPropagator: new CompositePropagator({
            propagators: [new AWSXRayPropagator(), new W3CBaggagePropagator()],
        }),
        instrumentations: [
            new HttpInstrumentation(),
            new ExpressInstrumentation(),
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
