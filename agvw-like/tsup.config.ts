import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    target: "es6",
    format: "esm",
    dts: true,
    sourcemap: true,
    clean: true,
});
