import { HttpServer } from "./server";

const MANAGER_PORT = Number.parseInt(process.env.MANAGER_PORT ?? "3100");
new HttpServer().listen(MANAGER_PORT);
