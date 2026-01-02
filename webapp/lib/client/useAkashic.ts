import { useContext } from "react";
import { AkashicContext } from "./akashic-context";

export function useAkashic() {
    const ctx = useContext(AkashicContext);
    if (!ctx) {
        throw new Error("useAkashic must be used within AkashicProvider");
    }
    return ctx;
}
