import * as process from "node:process";
import { PlayManager } from "./PlayManager";
import { HttpServer } from "./HttpServer";
import { SocketServer } from "./SocketServer";
import { createValkeyConnection } from "./createValkeyConnection";
import { AMFlowServerManager } from "./AMFlowServerManager";

(async () => {
    const valkey = await createValkeyConnection(
        process.env.VALKEY_HOST ?? "localhost",
        parseInt(process.env.VALKEY_PORT ?? "6379"),
        process.env.VALKEY_NO_TLS?.toLowerCase() === "true",
    );

    const amfManager = new AMFlowServerManager({ valkey });
    const playManager = new PlayManager({ amfManager });

    const allowOrigins = [process.env.CLIENT_ORIGIN].filter(
        (str) => str,
    ) as string[];
    const http = new HttpServer({
        amfManager,
        playManager,
        allowOrigins,
        adminApiToken: process.env.STORAGE_ADMIN_TOKEN ?? "",
    });
    new SocketServer({
        http: http.getPublicHttp(),
        amfManager,
        allowOrigins,
    });

    const exit = async () => {
        console.log("destroy server forcibly");
        http.close();
        await amfManager.destroy();
        try {
            valkey.close();
        } catch (err) {
            console.error(err);
        }
        process.exit(0);
    };
    process.on("SIGINT", async () => await exit());
    process.on("SIGTERM", async () => await exit());

    http.listen(
        parseInt(process.env.PUBLIC_PORT ?? "3031"),
        parseInt(process.env.ADMIN_PORT ?? "3033"),
    );
})();
