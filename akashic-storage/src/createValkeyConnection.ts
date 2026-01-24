import { GlideClient } from "@valkey/valkey-glide";

export const createValkeyConnection = async (
    host: string,
    port: number,
    noTls: boolean,
) =>
    GlideClient.createClient({
        addresses: [
            {
                host,
                port,
            },
        ],
        useTLS: !noTls,
    });
