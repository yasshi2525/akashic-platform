"use server";

import type { GameConfiguration } from "@akashic/game-configuration";
import { internalContentBaseUrl } from "./akashic";

export async function fetchGameJson(contentId: number) {
    return (await (
        await fetch(`${internalContentBaseUrl}/${contentId}/game.json`)
    ).json()) as GameConfiguration;
}

export async function getContentViewSize(gameJson: GameConfiguration) {
    return {
        width: gameJson.width ?? 1280,
        height: gameJson.height ?? 720,
    };
}
