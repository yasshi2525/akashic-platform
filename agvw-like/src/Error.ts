const error = (message: string) => {
    // NOTE: 元のコードでは引数なしでも動くが、転記ミス防止のため引数必須にした
    return (cause: Error | string | undefined) => {
        const e = new Error(message);
        e.name = message;
        // NOTE: ES2022以降のError実装に合わせている。ライブラリ内での具体的な使用箇所はない
        // @ts-expect-error
        e.cause = cause;
        return e;
    };
};

export const ErrorFactory = {
    createInvalidOperationError: error("InvalidOperation"),
    createGameDriverError: error("GameDriverError"),
    // NOTE: 元のコードでは "LoadMuduleError" となっているが、 typo と思われるため Module に修正した
    createLoadModuleError: error("LoadModuleError"),
    createPlaylogError: error("PlaylogError"),
    createHttpRequestError: error("HttpRequestError"),
    createInvalidGameError: error("InvalidGameError"),
    createAbortGameError: error("AbortGameError"),
    createPostMessageError: error("PostMessageError"),
    createInsecureFrameUrlError: error("InsecureFrameUrlError"),
} as const;
