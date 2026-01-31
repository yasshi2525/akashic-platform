"use client";

import { JSX, useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Stack } from "@mui/material";
import { GitHub, Google, Twitter } from "@mui/icons-material";
import {
    AuthProvider,
    authProviderNames,
    authProviders,
} from "@/lib/client/auth-providers";

const providerIcons: Record<AuthProvider, JSX.Element> = {
    github: <GitHub />,
    google: <Google />,
    twitter: <Twitter />,
};

export function SignIn({
    size = "large",
}: {
    size?: "small" | "medium" | "large";
}) {
    const [sendingProvider, setSendingProvider] = useState<AuthProvider>();

    function handleClick(provider: AuthProvider) {
        if (sendingProvider) {
            return;
        }
        setSendingProvider(provider);
        signIn(provider);
    }

    return (
        <Stack spacing={2} alignItems="stretch" sx={{ width: "100%" }}>
            {authProviders.map((provider) => (
                <Button
                    key={provider}
                    variant="contained"
                    size={size}
                    onClick={() => handleClick(provider)}
                    disabled={!!sendingProvider}
                    startIcon={providerIcons[provider]}
                    sx={{ textTransform: "none" }}
                >
                    {authProviderNames[provider]}でサインイン
                </Button>
            ))}
        </Stack>
    );
}
