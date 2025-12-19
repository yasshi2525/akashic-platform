import * as process from "node:process";
import path from "node:path";
import { createRequire } from "node:module";
import { NextApiRequest, NextApiResponse } from "next";

const require = createRequire(path.join(process.cwd(), path.sep));

interface EngineFilesVersions {
    [majorVer: string]: {
        version: string;
        fileName: string;
    };
}

const versions: EngineFilesVersions = require("./config/engineFilesVersion.json");
const engineFilePaths = (Object.keys(versions) as (keyof EngineFilesVersions)[])
    .map((v) => versions[v].fileName)
    .map((path) => `/akashic/${path}`);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({
        engine_urls: engineFilePaths.map(
            (path) => `http://${req.headers["host"]}${path}`,
        ),
    });
}
