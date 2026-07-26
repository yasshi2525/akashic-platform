import type { Tick } from "@akashic/playlog";

/**
 * 巨大な応答（TickList, StartPoint）を複数メッセージに分割して転送する。
 *
 * NOTE: Socket.IO には送信キューの drain を待つ API が無く、emit したデータは
 * 送出完了までサーバのメモリに滞留する。応答を分割し、チャンクごとの ack を
 * 待ってから次を送ることで、サーバが同時に保持する量をチャンク 1 件分に抑える。
 */

/**
 * getTickList の応答ヘッダ。実データは後続の {@link TransferChunk} で届く。
 */
export interface TickListTransferHeader {
    transferId: string;
    from: number;
    to: number;
}

/**
 * getStartPoint の応答ヘッダ。実データは後続の {@link TransferChunk} で届く。
 */
export interface StartPointTransferHeader {
    transferId: string;
}

/**
 * getTickList は Tick の配列を、getStartPoint は StartPoint を JSON 直列化した
 * 文字列の断片を運ぶ。
 */
export type TransferPayload = Tick[] | string;

export interface TransferChunk<T extends TransferPayload = TransferPayload> {
    transferId: string;
    /** 0 始まり。欠落・順序逆転の検出に用いる */
    seq: number;
    payload: T;
    /** 最終チャンクなら true */
    last: boolean;
}

export type TickListChunk = TransferChunk<Tick[]>;

export type StartPointChunk = TransferChunk<string>;

/**
 * 文字列を最大 `maxLength` 文字ずつに分割する。空文字列の場合も
 * 空文字列 1 件を返すため、戻り値は必ず 1 件以上となる。
 *
 * NOTE: サロゲートペアの途中で切ると断片単体が不正な UTF-16 列となり、
 * 転送時の UTF-8 エンコードで文字化けする。境界がペアの間に来た場合は
 * 1 文字ずらして分割する。
 */
export const sliceTransferData = (src: string, maxLength: number) => {
    if (maxLength <= 0) {
        throw new Error(`maxLength must be positive but ${maxLength}`);
    }
    if (src.length === 0) {
        return [""];
    }
    const result: string[] = [];
    let start = 0;
    while (start < src.length) {
        let end = Math.min(start + maxLength, src.length);
        if (end < src.length) {
            const code = src.charCodeAt(end - 1);
            const isHighSurrogate = code >= 0xd800 && code <= 0xdbff;
            if (isHighSurrogate) {
                end++;
            }
        }
        result.push(src.slice(start, end));
        start = end;
    }
    return result;
};
