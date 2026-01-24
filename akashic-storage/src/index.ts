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
    });
    new SocketServer({
        http: http.getHttp(),
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

    const port = parseInt(process.env.PORT ?? "3031");
    http.listen(port);
})();
