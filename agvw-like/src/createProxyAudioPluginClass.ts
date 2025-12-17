import type * as g from "@akashic/akashic-engine";
import type { ProxyAudioHandlerSet } from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioHandlerSet";
import { ProxyAudioAsset } from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioAsset";
import { ProxyAudioPlayer } from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioPlayer";
import type { AudioManager } from "@akashic/pdi-browser/lib/full/AudioManager";
import type { AudioPlugin } from "@akashic/pdi-browser";
import type { AudioSystem, AudioAssetHint } from "@akashic/pdi-types";

export const createProxyAudioPluginClass = (
    _g: typeof g,
    handlerSet: ProxyAudioHandlerSet,
) => {
    // NOTE: 元の実装では Akashic Engine v2 互換性のため g.AudioAsset の存在をチェックしているが
    // 本ライブラリは v3 サポートのため削除した。
    // v3 の場合 pdi-common-impl の AudioAsset をここで拡張しているが、
    // 元の実装をそのまま移植すると最新版の pdi-browser の AudioAsset に準拠しないものができあがる。
    // 同等の実装が pdi-browser の ProxyAudioPlugin にあったので、独自に拡張せずに ProxyAudioPlugin を利用する

    // NOTE: 元の実装では Akashic Engine v2 互換性のため g.AudioPlayer の存在をチェックしているが
    // 本ライブラリは v3 サポートのため削除した。
    // v3 の場合 pdi-common-impl の AudioPlayer をここで拡張しているが、
    // pdi-browser の ProxyAudioPlayer と同じコードが書かれていたため、独自に拡張せずに ProxyAudioPlayer を利用する

    // NOTE: 以下と同等の実装が pdi-browser の ProxyAudioPlugin にあるが、
    // それを利用しようとすると TypeScript の制限 (private メンバの存在)によりトランスパイルエラーとなるのでコピペ状態で実装
    return class implements AudioPlugin {
        supportedFormats: string[] = [];

        static isSupported() {
            return true;
        }

        createAsset(
            id: string,
            assetPath: string,
            duration: number,
            system: AudioSystem,
            loop: boolean,
            hint: AudioAssetHint,
            offset: number,
        ) {
            return new ProxyAudioAsset(
                handlerSet,
                id,
                assetPath,
                duration,
                system,
                loop,
                hint,
                offset,
            );
        }

        createPlayer(system: AudioSystem, manager: AudioManager) {
            return new ProxyAudioPlayer(handlerSet, system, manager);
        }

        /**
         * NOTE: もとの実装では定義されていないが、最新版の pdi-browser を用いるとエラーになるため追加で定義した
         */
        clear() {}
    };
};
