import { User } from "../types";

export type AuthAction =
    | { type: "login"; user: User }
    | { type: "update-profile"; update: { name?: string } };
