"use client";

import Link from "next/link";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";

export function PlayEndNotification({ reason }: { reason: PlayEndReason }) {
    function toMessage(reason: PlayEndReason) {
        switch (reason) {
            case "GAMEMASTER":
                return "部屋主がゲームを終了しました。";
            case "TIMEOUT":
                return "プレイ可能な最大時間を過ぎたため、強制終了しました。";
            case "DEL_CONTNET":
                return "ゲームが削除されたため、強制終了しました。";
            case "INTERNAL_ERROR":
            default:
                return "不明なエラーが発生したため、強制終了しました。";
        }
    }

    function handleClose() {
        // do-nothing
        // これが存在しないとモーダル外クリックでウィンドウが更新されてしまう
    }

    return (
        <Dialog
            open={true}
            onClose={handleClose}
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
        >
            <DialogTitle id="dialog-title">ゲームが終了しました</DialogTitle>
            <DialogContent>
                <DialogContentText id="dialog-description">
                    {toMessage(reason)}
                </DialogContentText>
                <DialogActions>
                    <Button variant="contained" component={Link} href="/">
                        退出する
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
