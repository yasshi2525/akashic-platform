"use client";

import { ReactNode } from "react";
import { CustomFooterContext } from "@/lib/client/custom-footer-context";

export function CustomFooterProvider({
    customFooterHref,
    customFooterLabel,
    customFooterImagePath,
    customFooterImageWidth,
    children,
}: {
    customFooterHref?: string;
    customFooterLabel?: string;
    customFooterImagePath?: string;
    customFooterImageWidth?: number;
    children: ReactNode;
}) {
    return (
        <CustomFooterContext
            value={{
                customFooterHref,
                customFooterLabel,
                customFooterImagePath,
                customFooterImageWidth,
            }}
        >
            {children}
        </CustomFooterContext>
    );
}
