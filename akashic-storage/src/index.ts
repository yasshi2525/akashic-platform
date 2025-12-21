import * as process from "node:process";
import { AMFlowServer } from "./AMFlowServer";
import { PlayManager } from "./PlayManager";
import { HttpServer } from "./HttpServer";
import { SocketServer } from "./SocketServer";
import { createRedisConnection } from "./createRedisConnection";

(async () => {
    const redis = await createRedisConnection(process.env.REDIS_URL);

    const amfServer = new AMFlowServer({ redis });
    const playManager = new PlayManager({ amfServer });

    const allowOrigins = [process.env.CLIENT_ORIGIN].filter(
        (str) => str,
    ) as string[];
    const http = new HttpServer({
        amfServer,
        playManager,
        allowOrigins,
    });
    new SocketServer({ http: http.getHttp(), amfServer, allowOrigins });

    const port = parseInt(process.env.PORT ?? "3031");
    http.listen(port);
})();
