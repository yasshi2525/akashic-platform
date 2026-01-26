"use client";

import { startTransition, useOptimistic, useState } from "react";
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
import { deleteGame } from "@/lib/server/content-delete";
import { messageKey, messages } from "@/lib/types";

export function GameDeleteDialog({
    gameId,
    publisherId,
}: {
    gameId: number;
    publisherId: string;
}) {
    const [open, setOpen] = useState(false);
    const [sending, setIsSending] = useOptimistic(false, () => true);
    const [error, setError] = useState<string>();

    async function handleSubmit() {
        startTransition(() => {
            setIsSending(true);
        });
        const res = await deleteGame({ gameId, publisherId });
        if (res.ok) {
            redirect(`/?${messageKey}=${messages.content.deleteSuccessful}`);
        } else {
            switch (res.reason) {
                case "InvalidParams":
                    setError(
                        "内部エラーが発生しました。入力内容を確認してもう一度実行してください。",
                    );
                    break;
                case "NotFound":
                    setError("このゲームが見つかりませんでした。");
                    break;
                case "InternalError":
                default:
                    setError(
                        "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                    );
                    break;
            }
            setIsSending(false);
        }
    }

    function handleClick() {
        setOpen(true);
    }

    function handleClose() {
        setOpen(false);
    }

    return (
        <>
            <Button variant="outlined" color="error" onClick={handleClick}>
                ゲームを削除する
            </Button>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                <DialogTitle id="dialog-title">
                    このゲームを削除しますか？
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        投稿したゲームと関連するデータが削除されます。削除後は復元できません。
                    </DialogContentText>
                    {error ? (
                        <Alert
                            variant="outlined"
                            severity="error"
                            sx={{ mt: 1 }}
                        >
                            {error}
                        </Alert>
                    ) : null}
                    <DialogActions>
                        <Button
                            variant="contained"
                            color="error"
                            loading={sending}
                            disabled={sending}
                            onClick={handleSubmit}
                        >
                            削除する
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            loading={sending}
                            disabled={sending}
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
