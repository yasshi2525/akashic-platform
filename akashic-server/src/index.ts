import * as process from "node:process";
import { RunnerManager } from "./runnerManager";
import { HttpServer } from "./httpServer";

const storagePublicUrl =
    process.env.STORAGE_PUBLIC_URL ?? "http://localhost:3031";
const storageAdminUrl =
    process.env.STORAGE_ADMIN_URL ?? "http://localhost:3033";
const storageAdminToken = process.env.STORAGE_ADMIN_TOKEN ?? "";
const apiToken = process.env.SERVER_API_TOKEN ?? "";

const manager = new RunnerManager({
    storagePublicUrl,
    storageAdminUrl,
    storageAdminToken,
});
const http = new HttpServer({ manager, apiToken });

const exit = async () => {
    console.log("destroy server forcibly");
    http.close();
    await manager.destroy();
    process.exit(0);
};
process.on("SIGINT", async () => await exit());
process.on("SIGTERM", async () => await exit());

const port = parseInt(process.env.PORT ?? "3032");
http.listen(port);
