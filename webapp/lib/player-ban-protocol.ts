/**
 * ゲーム内BAN拡張 (`@multi-indiegame/akashic-player-ban`) の wire format。
 * 仕様: https://github.com/multi-indiegame/akashic-external-protocol/blob/main/PROTOCOL.md
 *
 * WHY: 本来は `@multi-indiegame/akashic-player-ban/protocol` を参照する層だが、
 * まだ npm 未公開のため同内容をここに置く。値を変えるとコンテンツ側と版がずれて
 * 通知が届かなくなるので、パッケージの protocol.ts と一致させること。
 *
 * 公開後はこのファイルの中身を下記の re-export に差し替えるだけでよい
 * （パッケージ側は変更不要なことを確認済み。`/protocol` は g に触れないので
 * サーバー側から参照しても akashic-engine のグローバル型を引き込まない）。
 *
 *   export {
 *       RESERVED_PLAYER_ID,
 *       EXTERNAL_KEY as PLAYER_BAN_EXTERNAL_KEY,
 *       NOTIFICATION_TYPE as PLAYER_BAN_NOTIFICATION_TYPE,
 *       NOTIFICATION_VERSION as PLAYER_BAN_NOTIFICATION_VERSION,
 *       UNTRUSTED_SIGNATURE as PLAYER_BAN_UNTRUSTED_SIGNATURE,
 *       buildNotificationEvent,
 *       buildBanNotificationEvent,
 *   } from "@multi-indiegame/akashic-player-ban/protocol";
 *
 * 併せて player-ban-plugin.ts も
 * `@multi-indiegame/akashic-player-ban-plugin` の re-export にできる。
 */

/**
 * 通知イベントの発行者として使う予約 playerId。
 *
 * WHY: XML の名前空間 URI と同じ扱いで、実行基盤の運営者が誰であってもこの文字列の
 * まま注入する。自分の org 名に置き換えると、その基盤の上でコンテンツが通知を
 * 受け取れなくなる。
 */
export const RESERVED_PLAYER_ID = ":multi-indiegame";

/** `g.game.external` 上のキー */
export const PLAYER_BAN_EXTERNAL_KEY = "playerBan";

/** 通知イベントの type。npm パッケージ名をそのまま使う */
export const PLAYER_BAN_NOTIFICATION_TYPE =
    "@multi-indiegame/akashic-player-ban";

/** この type の payload の版。受信側は完全一致のものだけ採用する */
export const PLAYER_BAN_NOTIFICATION_VERSION = 1;

/** playlog.EventCode.Message */
const EVENT_CODE_MESSAGE = 32;

export type PlayerBanAction = "banned" | "unbanned";

export type BanResultReason =
    /** 拡張が無い環境（headless runner、akashic-cli-serve、非対応の実行基盤） */
    | "NotSupported"
    /** 部屋主ではないインスタンス */
    | "NotGameMaster"
    /** 対象がこの部屋の視聴者ではない */
    | "NotInRoom"
    /** 自分自身は追放できない */
    | "SelfBan"
    /** 件数上限・レート制限 */
    | "LimitExceeded"
    /** 部屋主が確認ダイアログで拒否した */
    | "Rejected"
    | "Unauthorized"
    | "InternalError";

export interface BanResult {
    ok: boolean;
    playerId: string;
    reason?: BanResultReason;
}

export interface PlayerBanExternalContext {
    canBan: boolean;
}

/** `g.game.external.playerBan` に生えるオブジェクト */
export interface PlayerBanExternal {
    getContext: (param: {
        callback: (context: PlayerBanExternalContext) => void;
    }) => void;
    ban: (param: {
        playerId: string;
        callback: (result: BanResult) => void;
    }) => void;
    unban: (param: {
        playerId: string;
        callback: (result: BanResult) => void;
    }) => void;
}

/**
 * `untrusted: true` にしたときに関数呼び出しを橋渡しするためのメタデータ。
 * プロトコルの一部として固定されている。
 */
export const PLAYER_BAN_UNTRUSTED_SIGNATURE = {
    type: "object",
    content: {
        getContext: { type: "function", callbackProp: "arguments[0].callback" },
        ban: { type: "function", callbackProp: "arguments[0].callback" },
        unban: { type: "function", callbackProp: "arguments[0].callback" },
    },
} as const;

/** playlog の MessageEvent。@akashic/playlog に依存させないための最小形 */
export type NotificationEvent = [number, number, string, unknown];

/** 名前空間 `:multi-indiegame` の通知イベントを組み立てる */
export function buildNotificationEvent(
    type: string,
    version: number,
    payload: { [key: string]: unknown },
): NotificationEvent {
    // WHY: type / version は payload 側で上書きできてはならないので後から入れる
    const data: { [key: string]: unknown } = { ...payload, type, version };
    return [EVENT_CODE_MESSAGE, 0, RESERVED_PLAYER_ID, data];
}

/** BAN / 解除の確定時に playlog へ注入するイベントを組み立てる */
export function buildBanNotificationEvent(
    action: PlayerBanAction,
    playerId: string,
): NotificationEvent {
    return buildNotificationEvent(
        PLAYER_BAN_NOTIFICATION_TYPE,
        PLAYER_BAN_NOTIFICATION_VERSION,
        { action, playerId },
    );
}
