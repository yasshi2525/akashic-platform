import type {
    CreateAudioPlayerParameterObject,
    LoadAudioAssetParameterObject,
    ProxyAudioHandlerSet,
} from "@akashic/pdi-browser/lib/full/plugin/ProxyAudioPlugin/ProxyAudioHandlerSet";
import {
    PostMessageBridgeBase,
    RawMessageEventDataHandler,
} from "./PostMessageBridgeBase";
import { AudioMessage } from "./AudioMessage";

export const setupAudioPdiProxy = (
    handlers: ProxyAudioHandlerSet,
    bridge: PostMessageBridgeBase,
) => {
    const load: RawMessageEventDataHandler = (param, cb) => {
        handlers.loadAudioAsset(
            param as LoadAudioAssetParameterObject,
            (err) => cb && cb(err ? err.message : undefined, undefined),
        );
    };
    const unload: RawMessageEventDataHandler = (assetId) => {
        handlers.unloadAudioAsset(assetId as string);
    };
    const createPlayer: RawMessageEventDataHandler = (param) => {
        handlers.createAudioPlayer(param as CreateAudioPlayerParameterObject);
    };
    const destroyPlayer: RawMessageEventDataHandler = (audioPlayerId) => {
        handlers.destroyAudioPlayer(audioPlayerId as string);
    };
    const play: RawMessageEventDataHandler = (audioPlayerId) => {
        handlers.playAudioPlayer(audioPlayerId as string);
    };
    const stop: RawMessageEventDataHandler = (audioPlayerId) => {
        handlers.stopAudioPlayer(audioPlayerId as string);
    };
    const changeVolume: RawMessageEventDataHandler = (_param) => {
        const param = _param as { audioPlayerId: string; volume: number };
        handlers.changeAudioVolume(param.audioPlayerId, param.volume);
    };
    const changeRate: RawMessageEventDataHandler = (_param) => {
        const param = _param as { audioPlayerId: string; playbackRate: number };
        handlers.changeAudioPlaybackRate(
            param.audioPlayerId,
            param.playbackRate,
        );
    };
    bridge.on(AudioMessage.Load, load);
    bridge.on(AudioMessage.Unload, unload);
    bridge.on(AudioMessage.CreatePlayer, createPlayer);
    bridge.on(AudioMessage.DestroyPlayer, destroyPlayer);
    bridge.on(AudioMessage.Play, play);
    bridge.on(AudioMessage.Stop, stop);
    bridge.on(AudioMessage.ChangeVolume, changeVolume);
    bridge.on(AudioMessage.ChangeRate, changeRate);
    return () => {
        bridge.off(AudioMessage.Load, load);
        bridge.off(AudioMessage.Unload, unload);
        bridge.off(AudioMessage.CreatePlayer, createPlayer);
        bridge.off(AudioMessage.DestroyPlayer, destroyPlayer);
        bridge.off(AudioMessage.Play, play);
        bridge.off(AudioMessage.Stop, stop);
        bridge.off(AudioMessage.ChangeVolume, changeVolume);
        bridge.off(AudioMessage.ChangeRate, changeRate);
    };
};
