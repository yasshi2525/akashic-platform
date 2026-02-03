"use client";

import { ReactNode } from "react";
import { AkashicContext } from "@/lib/client/akashic-context";

export function AkashicProvider({
    playlogServerUrl,
    publicContentBaseUrl,
    children,
}: {
    playlogServerUrl: string;
    publicContentBaseUrl: string;
    children: ReactNode;
}) {
    return (
        <AkashicContext value={{ playlogServerUrl, publicContentBaseUrl }}>
            {children}
        </AkashicContext>
    );
}
