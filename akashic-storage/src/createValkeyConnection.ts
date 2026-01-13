import { GlideClient } from "@valkey/valkey-glide";

export const createValkeyConnection = async (host: string, port: number) =>
    GlideClient.createClient({
        addresses: [
            {
                host,
                port,
            },
        ],
        useTLS: true,
    });
