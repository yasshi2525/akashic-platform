import * as process from "node:process";
import { AMFlowServer } from "./AMFlowServer";
import { PlayManager } from "./PlayManager";
import { HttpServer } from "./HttpServer";
import { SocketServer } from "./SocketServer";
import { createRedisConnection } from "./createRedisConnection";
import { AMFlowServerManager } from "./AMFlowServerManager";

(async () => {
    const redis = await createRedisConnection(process.env.REDIS_URL);

    const amfManager = new AMFlowServerManager({ redis });
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

    const port = parseInt(process.env.PORT ?? "3031");
    http.listen(port);
})();
