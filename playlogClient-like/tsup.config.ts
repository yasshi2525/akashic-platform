import { defineConfig } from "tsup";
import * as path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), path.sep));

const globalName =
    "playlogClientV" + require("./package.json").version.replace(/[\.-]/g, "_");

export default defineConfig({
    entry: ["src/index.ts"],
    globalName,
    target: "es6",
    format: ["iife", "cjs"],
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
});
