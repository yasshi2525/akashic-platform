"use client";

import { ReactNode } from "react";
import { AkashicContext } from "@/lib/client/akashic-context";

export function AkashicProvider({
    playlogServerUrl,
    children,
}: {
    playlogServerUrl: string;
    children: ReactNode;
}) {
    return (
        <AkashicContext value={{ playlogServerUrl }}>{children}</AkashicContext>
    );
}
