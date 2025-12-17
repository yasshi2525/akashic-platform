import * as g from "@akashic/akashic-engine";
import * as GameDriver from "@akashic/game-driver";
import * as PdiBrowser from "@akashic/pdi-browser";
import * as PlaylogClient from "@yasshi2525/playlog-client-like";

export const isPlaylogClientUrl = (url: string) =>
    /.*\/playlogClientV.*\.js$/.test(url);

export const findPlaylogClientUrl = (urls: string[]) =>
    urls.find((url) => isPlaylogClientUrl(url));

export const detectPlaylogClientObject = (win: Window, url: string) => {
    const m = url.match(/.*\/(playlogClientV.*)\.js$/);
    if (m) {
        return win[m[1] as keyof Window] as typeof PlaylogClient;
    } else {
        return null;
    }
};

export const isEngineFilesUrl = (url: string) =>
    /.*\/engineFilesV.*\.js$/.test(url);

export const detectEngineFilesObject = (win: Window, url: string) => {
    const m = url.match(/.*\/(engineFilesV.*)\.js$/);
    if (m) {
        const engineFile = win[m[1] as keyof Window];
        return {
            g: engineFile.akashicEngine as typeof g,
            GameDriver: engineFile.gameDriver as typeof GameDriver,
            PdiBrowser: engineFile.pdiBrowser as typeof PdiBrowser,
        };
    }
    return null;
};

export const detectRuntimes = (win: Window, urls: string[]) => {
    const engineFileUrl = urls.find((url) => isEngineFilesUrl(url));
    let _g: typeof g | null = null;
    let _GameDriver: typeof GameDriver | null = null;
    let _PdiBrowser: typeof PdiBrowser | null = null;
    let playlogClient: typeof PlaylogClient | null = null;
    if (engineFileUrl) {
        const engineFile = detectEngineFilesObject(win, engineFileUrl);
        if (engineFile) {
            _g = engineFile.g;
            _GameDriver = engineFile.GameDriver;
            _PdiBrowser = engineFile.PdiBrowser;
        }
    }
    const playlogClientUrl = findPlaylogClientUrl(urls);
    if (playlogClientUrl) {
        const obj = detectPlaylogClientObject(win, playlogClientUrl);
        if (obj) {
            playlogClient = obj;
        }
    }
    if (_g && _GameDriver && _PdiBrowser && playlogClient) {
        return [
            null,
            {
                g: _g,
                GameDriver: _GameDriver,
                PdiBrowser: _PdiBrowser,
                PlaylogClient: playlogClient,
            },
        ] as const;
    } else {
        // NOTE: 元のコードでは require() によって解決を試みているので、下記の処理と同等と判断
        return [
            null,
            {
                g,
                GameDriver,
                PdiBrowser,
                PlaylogClient,
            },
        ] as const;
        // NOTE: 元のコードでは @akashic/playlog-client の require 失敗時にエラーとしているが、
        // 本プロジェクトでは @yasshi2525/playlog-client-like は import 済みのため、エラーケースなし
    }
};
