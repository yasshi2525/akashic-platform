"use client";

import { useOptimistic, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { updateUserHandle } from "@/lib/server/user";

export function HandleSetDialog({
    open,
    onClose,
    onHandleSet,
}: {
    open: boolean;
    onClose: () => void;
    onHandleSet: (handle: string) => void;
}) {
    const theme = useTheme();
    const [sending, setIsSending] = useOptimistic(false, () => true);
    const [error, setError] = useState<string>();
    const [handle, setHandle] = useState("");

    async function handleSubmit() {
        setIsSending(true);
        const res = await updateUserHandle(handle);
        if (res.ok) {
            onHandleSet(res.handle);
            onClose();
        } else {
            switch (res.reason) {
                case "Unauthorized":
                    setError("ハンドルの設定にはサインインが必要です。");
                    break;
                case "EmptyHandle":
                    setError("ハンドルを入力してください。");
                    break;
                case "InvalidFormatHandle":
                    setError(
                        "ハンドルは2〜20文字の英小文字・数字・アンダースコア・ハイフンで入力してください。先頭は英数字にしてください。",
                    );
                    break;
                case "ForbiddenHandle":
                    setError("そのハンドルは使用できません。");
                    break;
                case "HandleAlreadyExists":
                    setError("そのハンドルはすでに使用されています。");
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

    function handleClose() {
        setHandle("");
        setError(undefined);
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>ユーザー部屋用ハンドルを設定</DialogTitle>
            <DialogContent>
                <Typography
                    variant="body2"
                    color={theme.palette.text.secondary}
                    sx={{ mb: 2 }}
                >
                    ハンドルを設定すると <strong>/live/[ハンドル]</strong>{" "}
                    というURLから、いつでも自分が作成した最新の部屋に案内できます。
                </Typography>
                <TextField
                    label="ハンドル"
                    name="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="例: user12345"
                    helperText="2〜20文字の英小文字・数字・ _ ・ - が使えます。先頭は英数字にしてください。"
                    fullWidth
                    autoFocus
                    slotProps={{ htmlInput: { maxLength: 20 } }}
                />
                {error && (
                    <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}
                <DialogActions>
                    <Button
                        variant="outlined"
                        color="inherit"
                        disabled={sending}
                        onClick={handleClose}
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        loading={sending}
                        disabled={sending}
                        onClick={handleSubmit}
                    >
                        設定する
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
