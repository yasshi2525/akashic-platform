const authTypes = ["guest", "oauth"] as const;
type AuthType = (typeof authTypes)[number];

export interface User {
    id: string;
    name: string;
    authType: AuthType;
}

export interface Guest extends User {
    authType: "guest";
}

export interface OAuthUser extends User {
    authType: "oauth";
    image: string | null | undefined;
}

export const GUEST_IDKEY = "guest_id";
export const GUEST_NAME = "ゲスト";
