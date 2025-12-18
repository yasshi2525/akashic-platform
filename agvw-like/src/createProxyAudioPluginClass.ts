import type * as g from "@akashic/akashic-engine";
import type { ProxyAudioHandlerSet } from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioHandlerSet";
import { AudioAsset as BaseAudioAsset } from "@akashic/pdi-common-impl";
import { AudioPlayer } from "@akashic/pdi-common-impl";
import type { AudioManager } from "@akashic/pdi-browser/lib/full/AudioManager";
import type { AudioPlugin } from "@akashic/pdi-browser";
import type {
    AudioSystem,
    AudioAssetHint,
    AssetLoadHandler,
} from "@akashic/pdi-types";

export const createProxyAudioPluginClass = (
    _g: typeof g,
    handlerSet: ProxyAudioHandlerSet,
) => {
    // NOTE: 元の実装では Akashic Engine v2 互換性のため g.AudioAsset の存在をチェックしているが
    // 本ライブラリは v3 サポートのため削除した。

    // NOTE: 下記実装は pdi-browser の ProxyAudioPlugin, ProxyAudioPlayer と同じことをしているが、
    // これを import してしまうと window の存在を前提とするファイルを読み込んでしまい、サーバー側でエラーが発生する
    // そのためあえて同じような拡張をさせている。
    // なお、TypeScript 化するにあたり、 pdi-common-impl と pdi-browser における AudioAsset の型定義の差異がエラーになったため、差分を追加している。
    // (bundleファイルサイズを小さくするため、 pdi-browser の import は避けている)
    abstract class AudioAsset extends BaseAudioAsset {
        // NOTE: pdi-common-impl では number | undefined のため強制変換
        override offset: number;

        constructor(
            id: string,
            assetPath: string,
            duration: number,
            system: AudioSystem,
            loop: boolean,
            hint: AudioAssetHint,
            offset: number | undefined,
        ) {
            super(id, assetPath, duration, system, loop, hint, offset);
            this.offset = offset ?? 0;
        }

        // NOTE: pdi-common-impl の実装には存在しないため追加
        _modifyPath(path: string) {
            return path;
        }
    }

    class ProxyAudioAsset extends AudioAsset {
        _handlerSet: ProxyAudioHandlerSet;

        constructor(
            handlerSet: ProxyAudioHandlerSet,
            id: string,
            assetPath: string,
            duration: number,
            system: AudioSystem,
            loop: boolean,
            hint: AudioAssetHint,
            offset: number,
        ) {
            super(id, assetPath, duration, system, loop, hint, offset);
            this._handlerSet = handlerSet;
        }

        override destroy() {
            handlerSet.unloadAudioAsset(this.id);
            super.destroy();
        }

        override _load(loader: AssetLoadHandler) {
            handlerSet.loadAudioAsset(
                {
                    id: this.id,
                    assetPath: this.path,
                    duration: this.duration,
                    loop: this.loop,
                    hint: this.hint,
                    offset: this.offset ?? 0,
                },
                (err) => {
                    if (err) {
                        loader._onAssetError(this, err);
                    } else {
                        loader._onAssetLoad(this);
                    }
                },
            );
        }

        override _assetPathFilter(path: string) {
            return path;
        }
    }

    class ProxyAudioPlayer extends AudioPlayer {
        static _audioPlayerIdCounter: number = 0;
        // NOTE: pdi-common-impl の AudioAsset を pdi-browser の AudioAsset に強制型変換
        override currentAudio: AudioAsset | undefined;
        _audioPlayerId: string | null;
        _handlerSet: ProxyAudioHandlerSet;
        _manager: AudioManager;

        constructor(
            handlerSet: ProxyAudioHandlerSet,
            system: AudioSystem,
            manager: AudioManager,
        ) {
            super(system);
            this._audioPlayerId = null;
            this._handlerSet = handlerSet;
            this._manager = manager;
        }

        override changeVolume(volume: number) {
            super.changeVolume(volume);
            this._notifyVolumeToHandler();
        }

        override _changeMuted(muted: boolean) {
            super._changeMuted(muted);
            this._notifyVolumeToHandler();
        }

        override play(audio: AudioAsset) {
            if (this._audioPlayerId != null) {
                this.stop();
            }
            this._audioPlayerId = `ap${ProxyAudioPlayer._audioPlayerIdCounter++}`;
            this._handlerSet.createAudioPlayer({
                assetId: audio.id,
                audioPlayerId: this._audioPlayerId,
                isPlaying: true,
                volume: this._calculateVolume(),
                playbackRate: 1,
            });
            super.play(audio);
        }

        override stop() {
            if (this._audioPlayerId) {
                this._handlerSet.stopAudioPlayer(this._audioPlayerId);
                this._handlerSet.destroyAudioPlayer(this._audioPlayerId);
                this._audioPlayerId = null;
            }
            super.stop();
        }

        notifyMasterVolumeChanged() {
            this._notifyVolumeToHandler();
        }

        _notifyVolumeToHandler() {
            if (this._audioPlayerId) {
                this._handlerSet.changeAudioVolume(
                    this._audioPlayerId,
                    this._calculateVolume(),
                );
            }
        }

        _calculateVolume() {
            // NOTE: 元のコードでは後方互換性のためか _manager?.getMasterVolume?() ?? 1 と同等なことをしているが、ガードしなくてよいと判断
            return this._system._muted
                ? 0
                : this.volume *
                      this._system.volume *
                      this._manager.getMasterVolume();
        }
    }

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
