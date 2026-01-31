import { createContext } from "react";

export const AkashicContext = createContext<{
    playlogServerUrl: string;
} | null>(null);
