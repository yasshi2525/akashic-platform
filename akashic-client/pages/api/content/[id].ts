import * as process from "node:process";
import path from "node:path";
import { createRequire } from "node:module";
import { NextApiRequest, NextApiResponse } from "next";

const require = createRequire(path.join(process.cwd(), path.sep));

interface VersionSchema {
    version: string;
    fileName: string;
}

interface EngineFilesVersions {
    [majorVer: string]: VersionSchema;
}

const versions: EngineFilesVersions = require("./config/engineFilesVersion.json");
const engineFilePaths = (Object.keys(versions) as (keyof EngineFilesVersions)[])
    .map((v) => versions[v].fileName)
    .map((path) => `/akashic/${path}`);
const playlogClientPath =
    "/akashic/" +
    (require("./config/playlogClientVersion.json") as VersionSchema).fileName;

const engineUrls = [...engineFilePaths, playlogClientPath];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const baseUrl = `http://${req.headers["host"]}`;
    res.status(200).json({
        engine_urls: engineUrls.map((path) => baseUrl + path),
        content_url: `${baseUrl}/content/${req.query.id}/game.json`,
        asset_base_url: `${baseUrl}/content/${req.query.id}`,
        untrusted: false,
        content_id: req.query.id,
        external: [],
    });
}
