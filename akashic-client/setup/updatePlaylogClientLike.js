#!/usr/bin/env node

import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

try {
    console.log("start to copy playlogClientLike");
    const destDir = path.resolve(__dirname, "..", "public", "akashic");
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const entryPath = require.resolve("@yasshi2525/playlog-client-like");
    const rootPath = path.resolve(path.dirname(entryPath), ".."); // dist/index.js → package.json
    const version = require(path.join(rootPath, "package.json")).version;
    const fileName = `playlogClientV${version.replace(/[\.-]/g, "_")}.js`;
    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(entryPath, destPath);
    console.log("end to copy playlogClientLike");
    console.log("start to generate playlogClientVersion.json");
    const versionFilePath = path.resolve(
        __dirname,
        "..",
        "config",
        "playlogClientVersion.json",
    );
    const versionFileDir = path.dirname(versionFilePath);
    if (!fs.existsSync(versionFileDir)) {
        fs.mkdirSync(versionFileDir);
    }
    fs.writeFileSync(
        versionFilePath,
        JSON.stringify(
            {
                version,
                fileName,
            },
            null,
            2,
        ),
    );
    console.log("end to generate files");
} catch (e) {
    console.error(e);
    process.exit(1);
}
