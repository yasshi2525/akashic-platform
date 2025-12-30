import type { NicoliveSupportedModes } from "@akashic/game-configuration";

const authTypes = ["guest", "oauth"] as const;
type AuthType = (typeof authTypes)[number];

export interface User {
    id: string;
    name: string;
    image: string | null | undefined;
    authType: AuthType;
}

export interface Guest extends User {
    authType: "guest";
}

export interface OAuthUser extends User {
    authType: "oauth";
}

export const GUEST_IDKEY = "guest_id";
export const GUEST_NAME = "ゲスト";

export const GAMELIST_LIMITS = 10;

export interface GameInfo {
    id: number;
    title: string;
    iconURL: string;
    description: string;
    publisher: { id: string; name: string };
    contentId: number;
}

export const supportedAkashicVersions = ["3"];
export const supportedAkashicModes: NicoliveSupportedModes[] = [
    "multi",
    "multi_admission",
];

export const messageKey = "message";
export const messages = {
    content: { registerSuccessful: "registerSuccessful" },
};
