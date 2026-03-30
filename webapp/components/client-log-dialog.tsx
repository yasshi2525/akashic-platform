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
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { ClientCapturedLog, ClientLogSubmitResponse } from "@/lib/types";

interface ClientLogDialogProps {
    open: boolean;
    contentId: number;
    playId: string;
    getLogs: () => ClientCapturedLog[];
    isTruncated: boolean;
    lastSubmittedComment: string;
    onClose: () => void;
    onSubmitSuccess: (comment: string) => void;
}

export function ClientLogDialog({
    open,
    contentId,
    playId,
    getLogs,
    isTruncated,
    lastSubmittedComment,
    onClose,
    onSubmitSuccess,
}: ClientLogDialogProps) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string>();
    const [comment, setComment] = useState("");

    async function handleSubmit() {
        setLoading(true);
        setSubmitError(undefined);
        try {
            const res = await fetch(
                `/api/content/${contentId}/play/${playId}/client-logs`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        logs: getLogs(),
                        truncated: isTruncated,
                        comment,
                    }),
                },
            );
            const json: ClientLogSubmitResponse = await res.json();
            if (json.ok) {
                setComment("");
                onSubmitSuccess(comment);
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
            <DialogTitle>投稿主に不具合を報告する</DialogTitle>
            <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="body2">
                        投稿主に自身のログデータを送信します。送信した情報は投稿主のみ閲覧できます。
                        (※送信する情報に個人情報は含まれません)
                    </Typography>
                    {isTruncated && (
                        <Alert severity="warning" sx={{ py: 0 }}>
                            ログの長さが上限を超えたため、古いログは省略されています。
                        </Alert>
                    )}
                    <Typography
                        variant="body2"
                        color={theme.palette.text.secondary}
                        sx={{
                            whiteSpace: "pre-wrap",
                            border: 1,
                            borderColor: theme.palette.divider,
                            height: "6em",
                            overflow: "auto",
                            p: 0.5,
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                        }}
                    >
                        {getLogs().length === 0
                            ? "出力されたログがありません。"
                            : getLogs()
                                  .map((entry) => entry.message)
                                  .join("\n")}
                    </Typography>
                    {lastSubmittedComment && (
                        <Box>
                            <Typography
                                variant="caption"
                                color={theme.palette.text.secondary}
                            >
                                前回の送信時のコメント（参考）:
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    whiteSpace: "pre-wrap",
                                    border: 1,
                                    borderColor: theme.palette.divider,
                                    borderRadius: 1,
                                    p: 0.5,
                                    color: theme.palette.text.secondary,
                                    fontSize: "0.8rem",
                                }}
                            >
                                {lastSubmittedComment}
                            </Typography>
                        </Box>
                    )}
                    <TextField
                        label="追加情報（任意）"
                        placeholder="発生状況や再現手順など、気づいたことがあれば記入してください。"
                        multiline
                        minRows={2}
                        maxRows={6}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        variant="outlined"
                        size="small"
                        disabled={loading}
                    />
                    {submitError && (
                        <Alert variant="outlined" severity="warning">
                            {submitError}
                        </Alert>
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
