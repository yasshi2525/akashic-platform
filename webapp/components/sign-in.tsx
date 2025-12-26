"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@mui/material";

export function SignIn() {
    const [sending, setIsSending] = useState(false);

    function handleClick() {
        if (sending) {
            return;
        }
        setIsSending(true);
        signIn("github");
    }

    return (
        <Button
            variant="contained"
            size="large"
            onClick={handleClick}
            disabled={sending}
        >
            GitHubでサインイン
        </Button>
    );
}
