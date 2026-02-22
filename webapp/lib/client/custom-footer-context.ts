import { createContext } from "react";

export const CustomFooterContext = createContext<{
    customFooterHref?: string;
    customFooterLabel?: string;
    customFooterImagePath?: string;
    customFooterImageWidth?: number;
} | null>(null);
