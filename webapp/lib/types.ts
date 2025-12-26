const authTypes = ["guest"] as const;
type AuthType = (typeof authTypes)[number];

export interface User {
    id: string;
    name: string;
    authType: AuthType;
}

export interface Guest extends User {
    authType: "guest";
}

export const GUEST_IDKEY = "guest_id";
export const GUEST_NAME = "ゲスト";
