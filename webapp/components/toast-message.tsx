"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertColor, Snackbar } from "@mui/material";
import { messageKey, messages } from "@/lib/types";

function toMessage(message?: string | null): {
    severity: AlertColor;
    message?: string;
} {
    if (message == null) {
        return { severity: "info", message: undefined };
    }
    switch (message) {
        case messages.content.registerSuccessful:
            return { severity: "success", message: "ゲームが投稿されました" };
        case messages.play.registerSuccessful:
            return { severity: "success", message: "部屋が作成されました" };
        case messages.play.endSuccessful:
            return { severity: "success", message: "部屋を終了しました" };
        default:
            return { severity: "error", message: "不明なエラーが発生しました" };
    }
}

export function ToastMessage() {
    const searchParams = useSearchParams();
    const { severity, message } = toMessage(searchParams?.get(messageKey));
    const [open, setOpen] = useState(!!message);
    const handleClose = () => {
        setOpen(false);
    };
    if (!message) {
        return null;
    }
    return (
        <Snackbar
            open={open}
            slotProps={{
                clickAwayListener: {
                    onClickAway: (event) => {
                        (event as any).defaultMuiPrevented = true;
                    },
                },
            }}
            autoHideDuration={5000}
            onClose={handleClose}
        >
            <Alert severity={severity}>{message}</Alert>
        </Snackbar>
    );
}
