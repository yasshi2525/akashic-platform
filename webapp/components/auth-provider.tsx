"use client";

import { ReactNode, useReducer } from "react";
import { User } from "@/lib/types";
import { AuthContext } from "@/lib/client/auth-context";
import { authReducer } from "@/lib/client/auth-reducer";
import { AuthGuest } from "./auth-guest";

export function AuthProvider({
    user,
    children,
}: {
    user: User | null;
    children: ReactNode;
}) {
    const [currentUser, dispatcher] = useReducer(authReducer, user);
    return (
        <AuthContext value={[currentUser, dispatcher]}>
            <AuthGuest user={currentUser} dispatcher={dispatcher} />
            {children}
        </AuthContext>
    );
}
