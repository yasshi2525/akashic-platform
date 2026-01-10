import type { GameDriver } from "@akashic/game-driver";
import type { Game, Scene } from "@akashic/akashic-engine";
import { AkashicGameView, GameContent } from "@yasshi2525/agvw-like";

/**
 * {@link AkashicGameView#destroy} は Promise な gameDriver の終了を待たずに null リセットしてしまっている。
 * そこで安全に終了するよう上書きする
 */
export async function destroyAkashicGameView(view: AkashicGameView) {
    if (view.destroyed()) {
        return;
    }
    // GameDriver はスクリプトロードが終わらないと作成されない
    // GameDriver#destroy() を hook するために作成されるまで待機する。
    await waitUntilGameDriverReady(view);
    await waitUntilDestroyed(view);
    if (view._hasOwnGameViewShared) {
        if (!view._gameViewShared.destroyed()) {
            view._gameViewShared.destroy();
        }
        view._hasOwnGameViewShared = false;
    }
    view._gameViewShared = null!;
    // NOTE: agvw 実装は作成した div 要素を削除しないので手動で削除している
    view._gameContentShared.gameViewElement.destroy();
    view._gameContentShared = null!;
}

async function waitUntilGameDriverReady(view: AkashicGameView) {
    await Promise.all(
        getGameContents(view).map(
            async (content) =>
                await new Promise<void>((resolve) => {
                    if (content._loader) {
                        resolve();
                    } else {
                        content.addContentLoadListener({
                            onLoad: () => {
                                resolve();
                            },
                        });
                    }
                }),
        ),
    );
}

function isLoadingScene(scene: Scene | undefined) {
    return (
        !!scene &&
        (scene === scene.game._defaultLoadingScene ||
            scene === scene.game.loadingScene)
    );
}

function isMainScene(scene: Scene | undefined) {
    return (
        !!scene &&
        scene !== scene.game._initialScene &&
        scene !== scene.game._defaultLoadingScene &&
        scene !== scene.game.loadingScene
    );
}

/**
 * スクリプトロード中にdestroyするとエラーが発生する。
 * そのため、エラーが発生しなくなるタイミングまで待つ。
 * ただし、デバッグモードの画面ロードのように短時間で2回ロードすると loadingScene から進まない。
 * そのため、エラーは発生するが、そのときは強制終了させる措置をとっている。
 */
function isPrepared(scene: Scene | undefined) {
    return isLoadingScene(scene) || isMainScene(scene);
}

async function waitUntilSceneLoad(game: Game) {
    await new Promise<void>((resolve) => {
        if (isPrepared(game.scene())) {
            resolve();
        } else {
            game._onSceneChange.add((scene) => {
                if (isPrepared(scene)) {
                    resolve();
                    return true;
                }
            });
        }
    });
}

/**
 * GameDriver は initialScene のセットアップが終わる前に destroy するとエラーが起きるので、待機
 */
async function waitUntilPrepare(driver: GameDriver) {
    await new Promise<void>((resolve) => {
        if (driver._game) {
            waitUntilSceneLoad(driver._game).then(() => resolve());
        } else {
            driver.gameCreatedTrigger.addOnce((game) => {
                waitUntilSceneLoad(game).then(() => resolve());
            });
        }
    });
}

async function waitUntilDestroyed(view: AkashicGameView) {
    await new Promise<void>((resolve) => {
        const contents = getGameContents(view);
        const alives = new Set<GameContent>(contents);
        hooksDestroy(
            contents,
            (driver) => waitUntilPrepare(driver),
            (content) => {
                alives.delete(content);
                if (alives.size === 0) {
                    resolve();
                }
            },
        );
        view.removeAllContents();
    });
}

function getGameContents(view: AkashicGameView) {
    return Object.values(view._contents).filter(
        (content) => content instanceof GameContent,
    );
}

function hooksDestroy(
    contents: GameContent[],
    prepare: (driver: GameDriver) => Promise<void>,
    done: (content: GameContent) => void,
) {
    for (const content of contents) {
        content.getGameDriver()!.destroy = new Proxy(
            content.getGameDriver()!.destroy,
            {
                apply: async (target, thisArg) => {
                    await prepare(thisArg);
                    try {
                        await target.call(thisArg);
                    } catch (err) {
                        // デバッグモードの画面ロードのように短時間で2回ロードすると発生
                        console.debug(err);
                    }
                    done(content);
                },
            },
        );
    }
}
