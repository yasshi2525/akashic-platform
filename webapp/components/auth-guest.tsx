"use client";

import { ActionDispatch, useEffect } from "react";
import { Guest, User } from "@/lib/types";
import { AuthAction } from "@/lib/client/auth-action";

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
