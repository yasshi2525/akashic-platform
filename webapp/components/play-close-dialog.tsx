"use client";

import { useTransition, useState } from "react";
import { redirect } from "next/navigation";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import { messageKey, messages } from "@/lib/types";
import { endPlay } from "@/lib/server/play-end";

export function PlayCloseDialog({
    playId,
    afterClose,
}: {
    playId: string;
    afterClose: { action: "redirect" } | { action: "stay"; cb: () => void };
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string>();

    function handleSubmit() {
        startTransition(async () => {
            const res = await endPlay({ playId, reason: "GAMEMASTER" });
            if (res.ok) {
                switch (afterClose.action) {
                    case "redirect":
                        redirect(
                            `/?${messageKey}=${messages.play.endSuccessful}`,
                        );
                    case "stay":
                        afterClose.cb();
                        break;
                    default:
                        console.error(
                            "invalide afterClose action type.",
                            afterClose,
                        );
                        break;
                }
            } else {
                switch (res.reason) {
                    case "InvalidParams":
                        setError(
                            "内部エラーが発生しました。入力内容を確認してもう一度投稿してください。",
                        );
                        break;
                    case "InternalError":
                    default:
                        setError(
                            "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                        );
                        break;
                }
            }
        });
    }

    function handleClick() {
        setOpen(true);
    }

    function handleClose() {
        setOpen(false);
    }

    return (
        <>
            <Button
                variant="outlined"
                color="error"
                onClick={handleClick}
                sx={{ margin: "auto" }}
            >
                部屋を閉じる
            </Button>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                <DialogTitle id="dialog-title">部屋を閉じますか？</DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        現在遊んでいるゲームを終了します。この部屋に参加しているプレイヤーはこれ以上遊べなくなります。
                    </DialogContentText>
                    {error && (
                        <Alert
                            variant="outlined"
                            severity="error"
                            sx={{ mt: 1 }}
                        >
                            {error}
                        </Alert>
                    )}
                    <DialogActions>
                        <Button
                            variant="contained"
                            loading={isPending}
                            disabled={isPending}
                            onClick={handleSubmit}
                        >
                            終了する
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            loading={isPending}
                            disabled={isPending}
                            onClick={handleClose}
                        >
                            キャンセル
                        </Button>
                    </DialogActions>
                </DialogContent>
            </Dialog>
        </>
    );
}
