"use client";

import { ReactNode, useReducer } from "react";
import { User } from "@/lib/types";
import { AuthContext } from "@/lib/client/auth-context";
import { authReducer } from "@/lib/client/auth-reducer";

export function AuthProvider({
    user,
    children,
}: {
    user: User | null;
    children: ReactNode;
}) {
    // guest_id は proxy が発行済みなので、初期 user は SSR の getAuth で
    // 既に非 null。クライアント側でのゲスト発行ブートストラップは不要
    const [currentUser, dispatcher] = useReducer(authReducer, user);
    return (
        <AuthContext value={[currentUser, dispatcher]}>{children}</AuthContext>
    );
}
