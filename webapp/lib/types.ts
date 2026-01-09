import type { NicoliveSupportedModes } from "@akashic/game-configuration";

const authTypes = ["guest", "oauth"] as const;
type AuthType = (typeof authTypes)[number];

export interface User {
    id: string;
    name: string;
    image?: string;
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
    createdAt: Date;
    updatedAt: Date;
}

export const PLAYLIST_LIMITS = 12;

export interface PlayInfo {
    id: number;
    game: { title: string; iconURL: string };
    gameMaster: { name: string; iconURL?: string };
    participants: number;
    createdAt: Date;
}

export const supportedAkashicVersions = ["3"];
export const supportedAkashicModes: NicoliveSupportedModes[] = [
    "multi",
    "multi_admission",
];

const contentErrReasons = [
    "InvalidParams",
    "NoGameJson",
    "InvalidGameJson",
    "UnsupportedVersion",
    "UnsupportedMode",
    "InternalError",
] as const;
export type ContentErrorType = (typeof contentErrReasons)[number];
export type ContentErrorResponse = {
    ok: false;
    reason: ContentErrorType;
};
export type ContentResponse =
    | { ok: true; contentId: number }
    | ContentErrorResponse;

const gameErrReasons = ["InvalidParams", "NotFound", "InternalError"] as const;
export type GameErrorType = (typeof gameErrReasons)[number];
export type GameResponse =
    | { ok: true; data: GameInfo }
    | { ok: false; reason: GameErrorType };

const playErrReasons = [
    "InvalidParams",
    "ClosedPlay",
    "InternalError",
] as const;
export type PlayErrorType = (typeof playErrReasons)[number];
export type PlayResponse =
    | {
          ok: true;
          data: {
              playToken: string;
              contentId: number;
              gameMasterId: string;
              width: number;
              height: number;
          };
      }
    | { ok: false; reason: PlayErrorType };

export const messageKey = "message";
export const messages = {
    content: {
        registerSuccessful: "registerContentSuccessful",
        editSuccessful: "editContentSuccessful",
    },
    play: {
        registerSuccessful: "registerPlaySuccessful",
        endSuccessful: "endPlaySuccessful",
    },
} as const;
