"use client";

import { ReactNode } from "react";
import { CustomDataContext } from "@/lib/client/custom-data-context";

export function CustomDataProvider({
    customFooterHref,
    customFooterLabel,
    customFooterImagePath,
    customFooterImageWidth,
    niconicommonsWorkUrl,
    clientLogCacheMaxEntries,
    children,
}: {
    customFooterHref?: string;
    customFooterLabel?: string;
    customFooterImagePath?: string;
    customFooterImageWidth?: number;
    niconicommonsWorkUrl?: string;
    clientLogCacheMaxEntries: number;
    children: ReactNode;
}) {
    return (
        <CustomDataContext
            value={{
                customFooterHref,
                customFooterLabel,
                customFooterImagePath,
                customFooterImageWidth,
                niconicommonsWorkUrl,
                clientLogCacheMaxEntries,
            }}
        >
            {children}
        </CustomDataContext>
    );
}
