"use client";

import {
    Alert,
    Button,
    Snackbar,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";

export function CopyLinkBox({
    url,
    onCopy,
    mode,
}: {
    url?: string;
    onCopy: () => void;
    mode: "dark" | "light";
}) {
    const theme = useTheme();
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
            <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor:
                        mode === "light"
                            ? theme.palette.background.default
                            : theme.palette.background.paper,
                    cursor: "pointer",
                    flexGrow: 1,
                    overflow: "auto",
                }}
                onClick={onCopy}
            >
                {url ?? "リンクを準備中..."}
            </Typography>
            <Button
                startIcon={<ContentCopy />}
                variant="outlined"
                onClick={onCopy}
                disabled={!url}
                sx={{
                    borderColor:
                        mode === "light"
                            ? theme.palette.primary.light
                            : theme.palette.primary.main,
                    color:
                        mode === "light"
                            ? theme.palette.primary.light
                            : theme.palette.primary.main,
                }}
            >
                コピー
            </Button>
        </Stack>
    );
}

export function CopyStatusSnackbar({
    status,
    onClose,
    successMessage,
}: {
    status?: "success" | "error";
    onClose: () => void;
    successMessage: string;
}) {
    return (
        <Snackbar
            open={!!status}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            autoHideDuration={2500}
            onClose={onClose}
        >
            <Alert severity={status === "error" ? "error" : "success"}>
                {status === "success"
                    ? successMessage
                    : "クリップボードへのコピーに失敗しました。"}
            </Alert>
        </Snackbar>
    );
}
