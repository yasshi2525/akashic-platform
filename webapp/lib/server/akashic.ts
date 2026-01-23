import * as process from "node:process";
import engineVersions from "../../config/engineFilesVersion.json";
import playlogVersion from "../../config/playlogClientVersion.json";

export const publicBaseUrl =
    process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export const internalBaseUrl = process.env.INTERNAL_BASE_URL ?? publicBaseUrl;

export const publicContentBaseUrl =
    process.env.PUBLIC_CONTENT_BASE_URL ??
    `http://localhost:9000/akashic-content`;

export const internalContentBaseUrl =
    process.env.INTERNAL_CONTENT_BASE_URL ?? publicContentBaseUrl;

export const publicPlaylogServerUrl =
    process.env.PUBLIC_STORAGE_URL ?? "http://localhost:3031";

export const internalPlaylogServerUrl =
    process.env.INTERNAL_STORAGE_URL ?? publicPlaylogServerUrl;

export const akashicServerUrl =
    process.env.SERVER_URL ?? "http://localhost:3032";

const engineFilePaths = Object.entries(engineVersions)
    .map(([, v]) => v.fileName)
    .map((path) => `/akashic/${path}`);
const playlogClientPath = `/akashic/${playlogVersion.fileName}`;

export const engineUrls = [...engineFilePaths, playlogClientPath];
