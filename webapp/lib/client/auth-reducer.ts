import { User } from "../types";
import { AuthAction } from "./auth-action";

export function authReducer(state: User | null, action: AuthAction) {
    switch (action.type) {
        case "login":
            return login(state, action.user);
        case "update-profile":
            return updateProfile(state, action.update);
        default:
            throw new Error(`unknown action: ${(action as any).type}`);
    }
}

function login(state: User | null, user: User) {
    // ゲストアカウントで既存の認証情報を上書きしてしまわないようガードしている
    // Why? -> 非認証状態の場合、 cookie を使ってゲストIDを採番したい。
    // しかしゲストIDの取得には 1回 fetch が発生するため、ラグが発生する。
    // なので、万が一、認証後にゲストID設定が飛んできても上書きしないようにしている。
    if (state == null || state.authType === "guest") {
        return { ...user };
    } else {
        return { ...state };
    }
}

function updateProfile(state: User | null, update: { name?: string }) {
    if (state == null) {
        return null;
    }
    if (state.authType === "guest") {
        return { ...state };
    }
    const next = { ...state };
    if (update.name) {
        next.name = update.name;
    }
    return next;
}
