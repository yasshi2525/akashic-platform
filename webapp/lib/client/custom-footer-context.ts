import { createContext } from "react";

export const CustomFooterContext = createContext<{
    customFooterLabel?: string;
    customFooterImagePath?: string;
    customFooterImageWidth?: number;
} | null>(null);
