"use client";

import { useState } from "react";

export function useCopyToClipboard() {
    const [copyStatus, setCopyStatus] = useState<"success" | "error">();

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopyStatus("success");
        } catch (err) {
            console.warn("failed to copy to clipboard", err);
            setCopyStatus("error");
        }
    }

    function clearCopyStatus() {
        setCopyStatus(undefined);
    }

    return { copyStatus, copy, clearCopyStatus };
}
