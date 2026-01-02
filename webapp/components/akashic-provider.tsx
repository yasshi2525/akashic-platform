"use client";

import { ReactNode } from "react";
import { AkashicContext } from "@/lib/client/akashic-context";

export function AkashicProvider({
    playlogServerUrl,
    akashicServerUrl,
    children,
}: {
    playlogServerUrl: string;
    akashicServerUrl: string;
    children: ReactNode;
}) {
    return (
        <AkashicContext value={{ playlogServerUrl, akashicServerUrl }}>
            {children}
        </AkashicContext>
    );
}
