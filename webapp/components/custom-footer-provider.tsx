"use client";

import { ReactNode } from "react";
import { CustomFooterContext } from "@/lib/client/custom-footer-context";

export function CustomFooterProvider({
    customFooterLabel,
    customFooterImagePath,
    customFooterImageWidth,
    children,
}: {
    customFooterLabel?: string;
    customFooterImagePath?: string;
    customFooterImageWidth?: number;
    children: ReactNode;
}) {
    return (
        <CustomFooterContext
            value={{
                customFooterLabel,
                customFooterImagePath,
                customFooterImageWidth,
            }}
        >
            {children}
        </CustomFooterContext>
    );
}
