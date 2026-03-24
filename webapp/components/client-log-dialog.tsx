"use client";

import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Typography,
    useTheme,
} from "@mui/material";
import { ClientCapturedLog } from "@/lib/client/log-cache";
import { ClientLogSubmitResponse } from "@/lib/types";

interface ClientLogDialogProps {
    open: boolean;
    contentId: number;
    playId: string;
    clientId: string;
    errorMessage?: string;
    getLogs: () => ClientCapturedLog[];
    onClose: () => void;
    onSubmitSuccess: () => void;
}

export function ClientLogDialog({
    open,
    contentId,
    playId,
    clientId,
    errorMessage,
    getLogs,
    onClose,
    onSubmitSuccess,
}: ClientLogDialogProps) {
    const theme = useTheme();
    const [includeLogs, setIncludeLogs] = useState(true);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string>();

    async function handleSubmit() {
        setLoading(true);
        setSubmitError(undefined);
        try {
            const logs = includeLogs ? getLogs() : [];
            const res = await fetch(
                `/api/content/${contentId}/play/${playId}/client-logs`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        clientId,
                        logs,
                        errorMessage: errorMessage ?? null,
                    }),
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
                setSubmitError("送信に失敗しました。時間をおいて再試行してください。");
            }
        } catch {
            setSubmitError("送信に失敗しました。時間をおいて再試行してください。");
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        if (loading) return;
        setSubmitError(undefined);
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>不具合を投稿主に報告する</DialogTitle>
            <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {errorMessage && (
                        <Alert severity="error" variant="outlined">
                            <Typography variant="body2" fontFamily="monospace">
                                {errorMessage}
                            </Typography>
                        </Alert>
                    )}
                    <Typography variant="body2">
                        投稿主にトラブルシュート情報を送信します。送信した情報は投稿主のみ閲覧できます。
                    </Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={includeLogs}
                                onChange={(e) =>
                                    setIncludeLogs(e.target.checked)
                                }
                                disabled={loading}
                            />
                        }
                        label={
                            <Typography variant="body2">
                                直近のログを添付する
                            </Typography>
                        }
                    />
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
