import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    target: "es6",
    format: "iife",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
});
