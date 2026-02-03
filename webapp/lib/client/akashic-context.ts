import { createContext } from "react";

export const AkashicContext = createContext<{
    playlogServerUrl: string;
    publicContentBaseUrl: string;
} | null>(null);
