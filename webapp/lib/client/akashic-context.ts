import { createContext } from "react";

export const AkashicContext = createContext<{
    playlogServerUrl: string;
    akashicServerUrl: string;
} | null>(null);
