import type { NicoliveSupportedModes } from "@akashic/game-configuration";
import type { NotificationType } from "@yasshi2525/persist-schema";

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
    credit: string;
    streaming: boolean;
    playCount: number;
    license?: string;
    publisher: {
        id: string;
        name: string;
        image?: string;
    };
    contentId: number;
    createdAt: Date;
    updatedAt: Date;
}

export const PLAYLIST_LIMITS = 12;

export interface PlayInfo {
    id: number;
    playName: string;
    game: { title: string; iconURL: string };
    gameMaster: {
        userId?: string;
        name: string;
        iconURL?: string;
    };
    participants: number;
    createdAt: Date;
}

export const FEEDBACK_LIMITS = 10;

interface FeedbackAuthor {
    id?: string;
    name: string;
    iconURL?: string;
}

interface FeedbackReply {
    id: number;
    author: FeedbackAuthor;
    body: string;
    createdAt: Date;
}

export interface FeedbackPost {
    id: number;
    author: FeedbackAuthor;
    body: string;
    createdAt: Date;
    reply?: FeedbackReply;
}

export interface FeedbackGameSummary {
    id: number;
    title: string;
    iconURL: string;
}

export interface UserFeedbackItem {
    id: number;
    author: FeedbackAuthor;
    body: string;
    createdAt: Date;
    reply?: FeedbackReply;
    game: FeedbackGameSummary;
}

export const NOTIFICATION_LIMITS = 10;

export interface NotificationInfo {
    id: number;
    unread: boolean;
    type: NotificationType;
    iconURL?: string;
    body: string;
    link?: string;
    createdAt: Date;
}

export interface UserProfile {
    id: string;
    name: string;
    image?: string;
    /**
     * 自分自身の場合のみ値が格納。サインイン中のプロパイダ
     */
    provider?: string;
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
    "Shutdown",
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

const deleteGameErrReasons = [
    "InvalidParams",
    "NotFound",
    "InternalError",
] as const;
export type DeleteGameErrorType = (typeof deleteGameErrReasons)[number];
export type DeleteGameResponse =
    | { ok: true }
    | { ok: false; reason: DeleteGameErrorType };

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
              playName: string;
              game: GameInfo;
              gameMaster: {
                  id: string;
                  userId?: string;
                  name: string;
                  iconURL?: string;
              };
              width: number;
              height: number;
              createdAt: Date;
              remainingMs: number;
              expiresAt: number;
          };
      }
    | { ok: false; reason: PlayErrorType };

const feedbackErrReasons = [
    "InvalidParams",
    "NotFound",
    "InternalError",
] as const;
export type FeedbackErrorType = (typeof feedbackErrReasons)[number];
export type FeedbackResponse =
    | { ok: true; data: FeedbackPost[] }
    | { ok: false; reason: FeedbackErrorType };

const userProfileErrReasons = ["InvalidParams", "NotFound"] as const;
export type UserProfileErrorType = (typeof userProfileErrReasons)[number];
export type UserProfileResponse =
    | { ok: true; data: UserProfile }
    | { ok: false; reason: UserProfileErrorType };

const userFeedbackErrReasons = [
    "InvalidParams",
    "NotFound",
    "InternalError",
] as const;
export type UserFeedbackErrorType = (typeof userFeedbackErrReasons)[number];
export type UserFeedbackResponse =
    | { ok: true; data: UserFeedbackItem[] }
    | { ok: false; reason: UserFeedbackErrorType };

const notificationErrReasons = ["NotAuthorized", "InternalError"] as const;
export type NotificationErrorType = (typeof notificationErrReasons)[number];
export type NotificationResponse =
    | { ok: true; data: NotificationInfo[] }
    | { ok: false; reason: NotificationErrorType };

export const messageKey = "message";
export const messages = {
    content: {
        registerSuccessful: "registerContentSuccessful",
        editSuccessful: "editContentSuccessful",
        deleteSuccessful: "deleteContentSuccessful",
    },
    play: {
        registerSuccessful: "registerPlaySuccessful",
        endSuccessful: "endPlaySuccessful",
    },
} as const;
