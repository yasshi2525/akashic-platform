import { createClient } from "redis";

export type RedisConnection = Awaited<ReturnType<typeof createRedisConnection>>;

export const createRedisConnection = async (url?: string) =>
    createClient({
        url,
    })
        .on("error", (err) => console.warn("redis error:", err))
        .connect();
