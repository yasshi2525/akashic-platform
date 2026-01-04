import * as process from "node:process";
import { RunnerManager } from "./runnerManager";
import { HttpServer } from "./httpServer";

const storageUrl = process.env.STORAGE_URL ?? "http://localhost:3031";
const manager = new RunnerManager({ storageUrl });
const http = new HttpServer({ manager });

const exit = async () => {
    console.log("destroy server forcibly");
    http.close();
    await manager.destroy();
    process.exit(0);
};
process.on("SIGINT", exit);
process.on("SIGTERM", exit);

const port = parseInt(process.env.PORT ?? "3032");
http.listen(port);
