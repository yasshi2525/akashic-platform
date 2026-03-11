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
        requestTimeout: process.env.VALKEY_REQUEST_TIMEOUT_MS
            ? parseInt(process.env.VALKEY_REQUEST_TIMEOUT_MS)
            : undefined,
        readFrom: "preferReplica",
    });
