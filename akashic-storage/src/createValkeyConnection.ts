import { GlideClusterClient } from "@valkey/valkey-glide";

export const createValkeyConnection = async (
    host: string,
    port: number,
    noTls: boolean,
) =>
    GlideClusterClient.createClient({
        addresses: [
            {
                host,
                port,
            },
        ],
        useTLS: !noTls,
        inflightRequestsLimit: parseInt(
            process.env.INFLIGHT_REQUEST_LIMIT ?? "1000",
        ),
        // 接続リセット後の再接続時間を確保するため、requestTimeoutのデフォルト(250ms)よりも長くする。
        // ElastiCache フェイルオーバー中の再接続を考慮して延長する。
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT ?? "2000"),
        readFrom: "preferReplica",
        // クラスタートポロジー変化（ノード切替・フェイルオーバー）を定期的に検知する。
        // ElastiCache フェイルオーバー時の接続先更新を早めるため間隔を明示的に設定する。
        periodicChecks: {
            duration_in_sec: parseInt(
                process.env.PERIODIC_CHECK_INTERVAL ?? "30",
            ),
        },
        // 接続リセット後の再接続バックオフ設定。
        // ElastiCache のフェイルオーバー完了には通常10〜30秒かかるため、
        // 最大間隔を30秒程度に設定して確実に再接続できるようにする。
        connectionBackoff: {
            numberOfRetries: parseInt(
                process.env.CONNECTION_BACKOFF_RETRIES ?? "8",
            ),
            factor: parseInt(process.env.CONNECTION_BACKOFF_FACTOR ?? "500"),
            exponentBase: parseInt(process.env.CONNECTION_BACKOFF_BASE ?? "2"),
        },
        clientName: "akashic-storage",
    });
