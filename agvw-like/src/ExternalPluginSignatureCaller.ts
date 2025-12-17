type TrustedFunctionCallback = (a: null, args: unknown[] | undefined) => void;

export type TrustedFunctionArguments = Record<
    string,
    (...args: unknown[]) => void
>[];

type TrustedFunction = (
    args: TrustedFunctionArguments,
    cb: TrustedFunctionCallback | undefined,
) => void;

export interface FunctionTableObjectMetadata {
    type: "object";
    content: Record<string, FunctionTableMetadata>;
}

interface FunctionTableFunctionMetadata {
    type: "function";
    callbackProp: string | null;
}

export type FunctionTableMetadata =
    | FunctionTableObjectMetadata
    | FunctionTableFunctionMetadata;

// NOTE: 本当は再帰構造だが、再帰型定義がうまくできないのと呼び出し上できないのでこれで妥協
type ThisArgType = Record<string, Function | Record<string, Function>>;

export class ExternalPluginSignatureCaller {
    _trustedFunctionTable: Record<string, TrustedFunction>;

    constructor(metadata: FunctionTableObjectMetadata, thisArg: ThisArgType) {
        this._trustedFunctionTable = {};
        for (const key of Object.keys(metadata.content)) {
            this.setupFunctionTable(metadata.content[key], thisArg, key, key);
        }
    }

    call(
        type: string,
        args: TrustedFunctionArguments,
        cb: TrustedFunctionCallback | undefined,
    ) {
        const fn = this._trustedFunctionTable[type];
        if (fn) {
            fn(args, cb);
        }
    }

    setupFunctionTable(
        metadata: FunctionTableMetadata,
        thisArg: ThisArgType,
        propName: string,
        type: string,
    ) {
        if (metadata.type === "function") {
            const targetFunction = thisArg[propName] as Function;
            if (metadata.callbackProp) {
                const args = metadata.callbackProp.match(
                    /arguments\[(\d+)\]\.(.+)$/,
                );
                if (null == args) {
                    throw new Error("invalid callbackProp geven");
                }
                const idx = parseInt(args[1], 10);
                const prop = args[2];
                this._trustedFunctionTable[type] = (args, cb) => {
                    if (cb) {
                        if (args[idx] != null) {
                            const hoge = args[idx][prop];
                            args[idx][prop] = (...args) => {
                                cb(null, args);
                            };
                            targetFunction.apply(thisArg, args);
                        } else {
                            targetFunction.apply(thisArg, args);
                            cb(null, undefined);
                        }
                    }
                };
                return;
            }
            this._trustedFunctionTable[type] = (args) => {
                targetFunction.apply(thisArg, args);
            };
        } else if (metadata.type === "object") {
            for (const key of Object.keys(metadata.content)) {
                this.setupFunctionTable(
                    metadata.content[key],
                    thisArg[propName] as ThisArgType,
                    key,
                    `${type}:${key}`,
                );
            }
        }
    }
}
