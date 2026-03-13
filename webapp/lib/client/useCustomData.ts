import { useContext } from "react";
import { CustomDataContext } from "./custom-data-context";

export function useCustomData() {
    const ctx = useContext(CustomDataContext);
    if (!ctx) {
        throw new Error("useCustomData must be used within CustomDataProvider");
    }
    return ctx;
}
