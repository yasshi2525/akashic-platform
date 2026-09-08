import type { MemoryQueueDataBus } from "@cross-border-bridge/memory-queue-data-bus";
import type { Game } from "@akashic/game-driver";
import type { ExternalPlugin, GameContent } from "@yasshi2525/agvw-like";
import {
    BanResult,
    PLAYER_BAN_EXTERNAL_KEY,
    PLAYER_BAN_UNTRUSTED_SIGNATURE,
    PlayerBanExternal,
} from "../../player-ban-protocol";

/**
 * 実行基盤側が実装する層。権限判定・確認 UI・永続化・切断・通知の注入は
 * すべてこちらの責務で、プラグインは呼び出しを橋渡しするだけ。
 */
export interface PlayerBanBackend {
    ban: (playerId: string) => Promise<BanResult>;
}

/**
 * `g.game.external.playerBan` を生やす。仕様は akashic-external-protocol の
 * PROTOCOL.md、コンテンツ側は `@multi-indiegame/akashic-player-ban`。
 *
 * NOTE: 公開後は `@multi-indiegame/akashic-player-ban-plugin` の
 * `PlayerBanPlugin` / `PlayerBanBackend` の re-export に差し替えられる
 * （パッケージ側は変更不要なことを確認済み）。
 */
export class PlayerBanPlugin implements ExternalPlugin {
    name: string = PLAYER_BAN_EXTERNAL_KEY;
    untrustedSignature = PLAYER_BAN_UNTRUSTED_SIGNATURE;
    _backend: PlayerBanBackend;

    constructor(backend: PlayerBanBackend) {
        this._backend = backend;
    }

    onload(game: Game, databus: MemoryQueueDataBus, content: GameContent) {
        game.external[PLAYER_BAN_EXTERNAL_KEY] = {
            ban: ({ playerId, callback }) => {
                this._request(playerId, callback);
            },
        } satisfies PlayerBanExternal;
    }

    _request(playerId: string, callback: (result: BanResult) => void) {
        this._backend.ban(playerId).then(
            (result) => {
                callback(
                    result ?? {
                        ok: false,
                        playerId,
                        reason: "InternalError",
                    },
                );
            },
            (err) => {
                console.warn("failed to request player ban", err);
                callback({ ok: false, playerId, reason: "InternalError" });
            },
        );
    }
}
