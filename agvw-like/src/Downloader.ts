interface DownloadResult {
    cancel: () => void;
    isFinished: () => boolean;
}

type DownloadCallback = (error: Error | null, responseText: string) => void;

export class XhrDownloader {
    defaultTimeout: number;
    _createXmlHttpRequest: () => XMLHttpRequest;

    constructor(timeout: number | undefined) {
        this.defaultTimeout = timeout ?? 15e3;
        this._createXmlHttpRequest = () => new XMLHttpRequest();
    }

    start(url: string, cb: DownloadCallback) {
        const xhr = this._createXmlHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "text";
        xhr.timeout = this.defaultTimeout;
        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                cb(null, xhr.responseText);
            } else {
                cb(new Error("request failed: " + url), "");
            }
        });
        xhr.addEventListener("error", () =>
            cb(new Error(`request error: ${url}`), ""),
        );
        xhr.addEventListener("timeout", () =>
            cb(new Error(`request timed out: ${url}`), ""),
        );
        xhr.send();
        return {
            cancel: () => {
                if (xhr.readyState !== xhr.DONE) {
                    xhr.abort();
                }
            },
            isFinished: () => {
                return xhr.readyState === xhr.DONE;
            },
        };
    }
}

export class RetryDownloader {
    baseDownloader: XhrDownloader;
    defaultRetry: number;

    constructor(
        baseDownloader: XhrDownloader | undefined,
        defaultRetry: number = 2,
    ) {
        this.baseDownloader = baseDownloader ?? new XhrDownloader(undefined);
        this.defaultRetry = defaultRetry;
    }

    start(url: string, cb: DownloadCallback) {
        const state = { count: this.defaultRetry };
        const result: DownloadResult = {
            cancel: () => {},
            isFinished: () => false,
        };
        const tryDownload = () => {
            const subResult = this.baseDownloader.start(
                url,
                (err, response) => {
                    if (err != null) {
                        if (--state.count <= 0) {
                            cb(err, response);
                        } else {
                            setTimeout(() => tryDownload(), 0);
                        }
                    } else {
                        cb(null, response);
                    }
                },
            );
            result.cancel = subResult.cancel;
            result.isFinished = subResult.isFinished;
        };
        setTimeout(() => tryDownload(), 0);
        return result;
    }
}
