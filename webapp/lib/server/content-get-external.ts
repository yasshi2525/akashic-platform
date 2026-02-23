"use server";

import type { GameConfiguration } from "@akashic/game-configuration";

const implicitExternalMapper: { external: string; keywords: string[] }[] = [
    {
        external: "coe",
        keywords: ["@akashic-extension/coe"],
    },
];

/**
 * coe plugin は game.json に明示的に使われていることが現れないので別途判定
 */
function getImplicitExternal(gameJson: GameConfiguration) {
    const externals = new Set<string>();
    for (const { external, keywords } of implicitExternalMapper) {
        if (
            Object.keys(gameJson.moduleMainPaths ?? {}).some((main) =>
                keywords.includes(main),
            )
        ) {
            externals.add(external);
            continue;
        }
        if (
            Object.keys(gameJson.moduleMainScripts ?? {}).some((main) =>
                keywords.includes(main),
            )
        ) {
            externals.add(external);
            continue;
        }
        if (
            gameJson.globalScripts?.some((script) =>
                // 前方一致によるご判定を防止するため / をつけている
                keywords.some((keyword) => script.includes(`${keyword}/`)),
            )
        ) {
            externals.add(external);
            continue;
        }
    }
    return [...externals];
}

export async function getContentExternal(gameJson: GameConfiguration) {
    const explicitExternal = Object.keys(gameJson.environment?.external ?? {});
    const implicitExternal = getImplicitExternal(gameJson);
    return [...new Set([...implicitExternal, ...explicitExternal])];
}

export async function fetchContentExternal(url: string) {
    try {
        return await getContentExternal(await (await fetch(url)).json());
    } catch (err) {
        console.warn(`failed to fetch external in game.json. (url = ${url})`);
        return [];
    }
}
