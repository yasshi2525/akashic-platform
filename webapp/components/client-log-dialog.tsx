"use client";

import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
    useTheme,
} from "@mui/material";
import { ClientCapturedLog, ClientLogSubmitResponse } from "@/lib/types";

interface ClientLogDialogProps {
    open: boolean;
    contentId: number;
    playId: string;
    getLogs: () => ClientCapturedLog[];
    onClose: () => void;
    onSubmitSuccess: () => void;
}

export function ClientLogDialog({
    open,
    contentId,
    playId,
    getLogs,
    onClose,
    onSubmitSuccess,
}: ClientLogDialogProps) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string>();

    async function handleSubmit() {
        setLoading(true);
        setSubmitError(undefined);
        try {
            const res = await fetch(
                `/api/content/${contentId}/play/${playId}/client-logs`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ logs: getLogs() }),
                },
            );
            const json: ClientLogSubmitResponse = await res.json();
            if (json.ok) {
                onSubmitSuccess();
                onClose();
            } else if (json.reason === "RateLimited") {
                setSubmitError(
                    `しばらく時間をおいてから再送信してください（あと ${json.retryAfterSeconds} 秒）。`,
                );
            } else {
                setSubmitError(
                    "送信に失敗しました。時間をおいて再試行してください。",
                );
            }
        } catch {
            setSubmitError(
                "送信に失敗しました。時間をおいて再試行してください。",
            );
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        if (loading) {
            return;
        }
        setSubmitError(undefined);
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>投稿主にデバッグ情報を報告する</DialogTitle>
            <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="body2">
                        投稿主に自身のログデータを送信します。送信した情報は投稿主のみ閲覧できます。
                        (※送信する情報に個人情報は含まれません)
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            whiteSpace: "pre-wrap",
                            border: 1,
                            height: "4em",
                        }}
                    >
                        {getLogs()
                            .map((entry) => entry.message)
                            .join("\n")}
                    </Typography>
                    {submitError && (
                        <Alert severity="warning">{submitError}</Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={
                        loading ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                    sx={{
                        backgroundColor: theme.palette.primary.main,
                    }}
                >
                    送信する
                </Button>
            </DialogActions>
        </Dialog>
    );
}
