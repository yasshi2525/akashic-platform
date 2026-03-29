"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
} from "@mui/material";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";

interface PlayEndNotificationProps {
    reason: PlayEndReason;
    logCount: number;
    onReportLogs: () => void;
}

export function PlayEndNotification({
    reason,
    logCount,
    onReportLogs,
}: PlayEndNotificationProps) {
    const [open, setOpen] = useState(true);

    function toMessage(reason: PlayEndReason) {
        switch (reason) {
            case "GAMEMASTER":
                return "部屋主がゲームを終了しました。";
            case "TIMEOUT":
                return "プレイ可能な最大時間を過ぎたため、強制終了しました。";
            case "DEL_CONTENT":
                return "ゲームが削除されたため、強制終了しました。";
            case "INTERNAL_ERROR":
            default:
                return "不明なエラーが発生したため、強制終了しました。";
        }
    }

    function handleClose(ev: Event, reason?: string) {
        if (!reason) {
            setOpen(false);
        }
    }

    function handleReportLogs() {
        setOpen(false);
        onReportLogs();
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
        >
            <DialogTitle id="dialog-title">ゲームが終了しました</DialogTitle>
            <DialogContent>
                <DialogContentText id="dialog-description">
                    {toMessage(reason)}
                </DialogContentText>
                {logCount > 0 && (
                    <DialogContentText sx={{ mt: 1 }}>
                        プレイ中に {logCount}{" "}
                        件のログが記録されました。問題が発生した場合は投稿主に報告できます。
                    </DialogContentText>
                )}
                <DialogActions>
                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                        flexWrap="wrap"
                    >
                        {logCount > 0 && (
                            <Button
                                variant="outlined"
                                onClick={handleReportLogs}
                            >
                                ログを報告する
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            component={Link}
                            href="/"
                        >
                            退出する
                        </Button>
                    </Stack>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
