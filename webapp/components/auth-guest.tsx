"use client";

import { ActionDispatch, useEffect } from "react";
import { Guest, User } from "@/lib/types";
import { AuthAction } from "@/lib/client/auth-action";

async function fetcher(key: string) {
    return fetch(key).then((res) => res.json()) as Promise<User>;
}

export function AuthGuest({
    user,
    dispatcher,
}: {
    user: User | null;
    dispatcher: ActionDispatch<[AuthAction]>;
}) {
    useEffect(() => {
        if (user == null) {
            fetch("/api/guest", {
                method: "POST",
                cache: "no-store",
            })
                .then((res) => res.json())
                .then((guest: Guest) => {
                    dispatcher({
                        type: "login",
                        user: guest,
                    });
                });
        }
    }, []);

    return null;
}
