export const amflowErrorNames = [
    "InvalidStatus",
    "PermissionError",
    "NotImplemented",
    "Timeout",
    "BadRequest",
    "RuntimeError",
    "TokenRevoked",
] as const;

export type AMFlowErrorNameType = (typeof amflowErrorNames)[number];

/**
 * AMFlow のエラー名 `@akashic/amflow` の仕様に準ずる
 */
export const AMFlowErrorName = {
    /**
     * 不正な状態
     */
    InvalidStatus: "InvalidStatus",
    /**
     * 必要な権限が無い
     */
    PermissionError: "PermissionError",
    /**
     * 未実装
     */
    NotImplemented: "NotImplemented",
    /**
     * タイムアウト
     */
    Timeout: "Timeout",
    /**
     * 不正な要求
     */
    BadRequest: "BadRequest",
    /**
     * 実行時エラー
     */
    RuntimeError: "RuntimeError",
    /**
     * トークンが失効した
     */
    TokenRevoked: "TokenRevoked",
} as const satisfies Record<AMFlowErrorNameType, AMFlowErrorNameType>;

export interface AMFlowError {
    name: AMFlowErrorNameType;
    message?: string;
}

/**
 * 不正な状態
 */
export class InvalidStatusError extends Error {
    override name = AMFlowErrorName.InvalidStatus;
}

/**
 * 必要な権限が無い
 */
export class PermissionError extends Error {
    override name = AMFlowErrorName.PermissionError;
}

/**
 * 未実装
 */
export class NotImplementedError extends Error {
    override name = AMFlowErrorName.NotImplemented;
}

/**
 * タイムアウト
 */
export class TimeoutError extends Error {
    override name = AMFlowErrorName.Timeout;
}

/**
 * 不正な要求
 */
export class BadRequestError extends Error {
    override name = AMFlowErrorName.BadRequest;
}

/**
 * 実行時エラー
 */
export class RuntimeError extends Error {
    override name = AMFlowErrorName.RuntimeError;
}

/**
 * トークンが失効した
 */
export class TokenRevokedError extends Error {
    override name = AMFlowErrorName.TokenRevoked;
}

export const createAMFlowError = (err: AMFlowError) => {
    switch (err.name) {
        case "InvalidStatus":
            return new InvalidStatusError(err.message);
        case "PermissionError":
            return new PermissionError(err.message);
        case "NotImplemented":
            return new NotImplementedError(err.message);
        case "Timeout":
            return new TimeoutError(err.message);
        case "BadRequest":
            return new BadRequestError(err.message);
        case "RuntimeError":
            return new RuntimeError(err.message);
        case "TokenRevoked":
            return new TokenRevokedError(err.message);
        default:
            return new RuntimeError(err.message);
    }
};
