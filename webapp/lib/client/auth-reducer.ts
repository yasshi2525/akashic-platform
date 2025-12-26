import { User } from "../types";
import { AuthAction } from "./auth-action";

export function authReducer(state: User | null, action: AuthAction) {
    switch (action.type) {
        case "login":
            return login(state, action.user);
        default:
            throw new Error(`unknown action: ${action.type}`);
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
