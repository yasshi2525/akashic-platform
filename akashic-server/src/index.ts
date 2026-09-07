import "./tracing";
import process from "node:process";
import { installConsoleOverride } from "./logger";
import { RunnerManager } from "./runnerManager";
import { RunnerClient } from "./runnerClient";
import { HttpServer } from "./httpServer";

installConsoleOverride();

const publicWebappUrl =
    process.env.PUBLIC_WEBAPP_URL ?? "http://localhost:3000";
const storagePublicUrl =
    process.env.STORAGE_PUBLIC_URL ?? "http://localhost:3031";
const storageAdminUrl =
    process.env.STORAGE_ADMIN_URL ?? "http://localhost:3033";
const storageAdminToken = process.env.STORAGE_ADMIN_TOKEN ?? "";
const maxPreservingTickSize = parseInt(
    process.env.MAX_PRESERVING_TICK_SIZE ?? "0",
);
const webappApiToken = process.env.SERVER_WEBAPP_API_TOKEN ?? "";
const runnerUrl = process.env.RUNNER_URL ?? "http://localhost:3034";
const runnerServerApiToken = process.env.RUNNER_SERVER_API_TOKEN ?? "";
const serverRunnerApiToken = process.env.SERVER_RUNNER_API_TOKEN ?? "";

const runnerClient = new RunnerClient(runnerUrl, runnerServerApiToken);
const manager = new RunnerManager({
    publicWebappUrl,
    storagePublicUrl,
    storageAdminUrl,
    storageAdminToken,
    maxPreservingTickSize,
    runnerClient,
});
const http = new HttpServer({
    manager,
    webappApiToken,
    serverRunnerApiToken,
    storageAdminUrl,
    storageAdminToken,
});

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
