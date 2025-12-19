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
    res.status(200).json({
        engine_urls: engineUrls.map(
            (path) => `http://${req.headers["host"]}${path}`,
        ),
    });
}
