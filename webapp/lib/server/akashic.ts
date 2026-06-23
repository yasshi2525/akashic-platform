import process from "node:process";
import engineVersions from "../../config/engineFilesVersion.json";
import playlogVersion from "../../config/playlogClientVersion.json";

export const publicBaseUrl =
    process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export const internalBaseUrl = process.env.INTERNAL_BASE_URL ?? publicBaseUrl;

export const publicContentBaseUrl =
    process.env.PUBLIC_CONTENT_BASE_URL ??
    `http://localhost:9000/akashic-content`;

export const internalContentBaseUrl =
    process.env.INTERNAL_CONTENT_BASE_URL ?? publicContentBaseUrl;

export const publicPlaylogServerUrl =
    process.env.PUBLIC_STORAGE_URL ?? "http://localhost:3031";

/**
 * ブラウザのトレースを送信する OTLP/HTTP エンドポイント。
 * 空文字の場合はブラウザ計装を無効化する。
 * 推奨は同一オリジン proxy `/api/otel/v1/traces`（CORS 不要）。直接コレクタへ
 * 送る場合は Jaeger の `http://localhost:4318/v1/traces` 等を指定する。
 */
export const publicOtelExporterUrl =
    process.env.PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT ?? "";

/**
 * 同一オリジン proxy（`/api/otel/v1/traces` Route Handler）がブラウザのトレースを
 * 中継する転送先。内部コレクタの OTLP/HTTP traces エンドポイントを指す。
 * 空文字の場合は proxy を無効化（204 を返して送信を黙殺する）。
 * ローカルは docker ネットワーク内の `http://jaeger:4318/v1/traces`。
 */
export const internalOtelExporterUrl =
    process.env.INTERNAL_OTEL_EXPORTER_OTLP_ENDPOINT ?? "";

export const internalPlaylogServerUrl =
    process.env.INTERNAL_STORAGE_URL ?? publicPlaylogServerUrl;

export const akashicServerUrl =
    process.env.SERVER_URL ?? "http://localhost:3032";

export const akashicServerApiToken = process.env.SERVER_API_TOKEN ?? "";

export const withAkashicServerAuth = (headers?: HeadersInit) => {
    return {
        ...headers,
        "x-akashic-internal-token": akashicServerApiToken,
    };
};

const engineFilePaths = Object.entries(engineVersions)
    .map(([, v]) => v.fileName)
    .map((path) => `/akashic/${path}`);
const playlogClientPath = `/akashic/${playlogVersion.fileName}`;

export const engineUrls = [...engineFilePaths, playlogClientPath];
