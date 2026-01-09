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
    // NOTE: initialScene で destroy() するとエラーが発生したため、ゲームロードまで待機させている
    await waitUntilStarted(view);
    await waitUntilDestroyed(view);
    if (view._hasOwnGameViewShared) {
        if (!view._gameViewShared.destroyed()) {
            view._gameViewShared.destroy();
        }
        view._hasOwnGameViewShared = false;
    }
    view._gameViewShared = null!;
    view._gameContentShared = null!;
}

async function waitUntilStarted(view: AkashicGameView) {
    await Promise.all(
        getGameContents(view).map(
            async (content) =>
                await new Promise<void>((resolve) => {
                    const waitUntilPrepare = (
                        game: NonNullable<
                            NonNullable<
                                ReturnType<GameContent["getGameDriver"]>
                            >["_game"]
                        >,
                    ) => {
                        if (game.isLoaded) {
                            resolve();
                        } else {
                            game._onLoad.addOnce(() => {
                                resolve();
                            });
                        }
                    };
                    const waitUntilCreated = (
                        driver: NonNullable<
                            ReturnType<GameContent["getGameDriver"]>
                        >,
                    ) => {
                        if (driver._game) {
                            waitUntilPrepare(driver._game);
                        } else {
                            driver.gameCreatedTrigger.addOnce((game) => {
                                waitUntilPrepare(game);
                            });
                        }
                    };
                    if (content._loader) {
                        waitUntilCreated(content.getGameDriver()!);
                    } else {
                        content.addContentLoadListener({
                            onLoad: () => {
                                waitUntilCreated(content.getGameDriver()!);
                            },
                        });
                    }
                }),
        ),
    );
}

async function waitUntilDestroyed(view: AkashicGameView) {
    await new Promise<void>((resolve) => {
        const contents = getGameContents(view);
        const alives = new Set<GameContent>(contents);
        hooksDestroy(contents, (content) => {
            alives.delete(content);
            if (alives.size === 0) {
                resolve();
            }
        });
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
    done: (content: GameContent) => void,
) {
    for (const content of contents) {
        content.getGameDriver()!.destroy = new Proxy(
            content.getGameDriver()!.destroy,
            {
                apply: async (target, thisArg) => {
                    await target.call(thisArg);
                    done(content);
                },
            },
        );
    }
}
