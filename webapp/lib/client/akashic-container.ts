import type {
    PlayEndReason,
    PlayExtendPayload,
} from "@yasshi2525/amflow-client-event-schema";
import type { AMFlowClient } from "@yasshi2525/playlog-client-like";
import {
    AkashicGameView,
    ExecutionMode,
    GameContent,
} from "@yasshi2525/agvw-like";
import { User } from "../types";
import { destroyAkashicGameView } from "./akashic-gameview-destroyer";
import {
    CoeLimitedPlugin,
    ResolvingPlayerInfoRequest,
} from "./akashic-plugins/coe-limited-plugin";

interface AkashicContainerCreateParameterObject {
    parent: HTMLDivElement;
    user: User;
    contentId: number;
    playId: string;
    playToken: string;
    playlogServerUrl: string;
    onSkip: (skip: boolean) => void;
    onError: (errMsg: string) => void;
    onPlayEnd: (reason: PlayEndReason) => void;
    onPlayExtend: (payload: PlayExtendPayload) => void;
    onRequestPlayerInfo: (
        param: ResolvingPlayerInfoRequest | undefined,
    ) => void;
}

export class AkashicContainer {
    _current?: {
        view: AkashicGameView;
        resizeObserver: ResizeObserver;
    };
    _creationQueue: AkashicContainerCreateParameterObject[];

    constructor() {
        this._creationQueue = [];
    }

    create(param: AkashicContainerCreateParameterObject) {
        // 2つの view が存在すると、挙動として古いほうが止まる
        // 過去を破棄してから新規作成する
        if (this._current) {
            this._creationQueue.push(param);
        } else {
            const view = new AkashicGameView({
                container: param.parent,
                width: param.parent.clientWidth,
                height: param.parent.clientHeight,
                // NOTE: untrusted のときこの値が使用される。 akashic-cli-serve の値としている。
                trustedChildOrigin: /.*/,
            });
            view.registerExternalPlugin(
                new CoeLimitedPlugin({
                    onRequest: param.onRequestPlayerInfo,
                }),
            );
            const content = this._createContent(param);
            const resizeObserver = this._createResizeObserver(
                param.parent,
                content,
            );
            view.addContent(content);
            this._current = {
                view,
                resizeObserver,
            };
        }
    }

    async destroy() {
        if (this._current) {
            this._current.resizeObserver.disconnect();
            await destroyAkashicGameView(this._current.view);
            this._current = undefined;
            const next = this._creationQueue.shift();
            if (next) {
                this.create(next);
            }
        }
    }

    _createContent(param: AkashicContainerCreateParameterObject) {
        const content = new GameContent({
            player: {
                id: param.user.id,
                name: param.user.name,
            },
            playConfig: {
                playId: param.playId,
                playToken: param.playToken,
                executionMode: ExecutionMode.Passive,
                playlogServerUrl: param.playlogServerUrl,
            },
            contentUrl: `/api/content/${param.contentId}`,
        });
        content.addSkippingListener({
            onSkip: (isSkipping) => {
                param.onSkip(isSkipping);
            },
        });
        content.addErrorListener({
            onError: (err) => {
                param.onError(
                    "予期しないエラーが発生しました。画面を更新してください。",
                );
                console.error(err);
                content.pause();
            },
        });
        content.addContentLoadListener({
            onLoad: () => {
                const amflowcontent = content.getGameDriver()!._platform
                    .amflow as AMFlowClient;
                amflowcontent.onPlayEnd((reason) => param.onPlayEnd(reason));
                amflowcontent.onPlayExtend((payload) =>
                    param.onPlayExtend(payload),
                );
            },
        });
        return content;
    }

    _createResizeObserver(target: HTMLDivElement, content: GameContent) {
        const observer = new ResizeObserver((entries) => {
            for (const e of entries.filter((e) => e.target === target)) {
                content.setContentArea({
                    x: 0,
                    y: 0,
                    width: e.contentRect.width,
                    height: e.contentRect.height,
                });
            }
        });
        observer.observe(target);
        return observer;
    }
}
