import { useContext } from "react";
import { CustomFooterContext } from "./custom-footer-context";

export function useCustomFooter() {
    const ctx = useContext(CustomFooterContext);
    if (!ctx) {
        throw new Error(
            "useCustomFooter must be used within CustomFooterProvider",
        );
    }
    return ctx;
}
