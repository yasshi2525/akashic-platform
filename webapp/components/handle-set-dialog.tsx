"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from "@mui/material";
import { updateUserHandleAction, UserHandleFormState } from "@/lib/server/user";

const initialState: UserHandleFormState = { ok: true, submitted: false };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="contained" disabled={pending}>
            設定する
        </Button>
    );
}

export function HandleSetDialog({
    open,
    onClose,
    onHandleSet,
}: {
    open: boolean;
    onClose: () => void;
    onHandleSet: (handle: string) => void;
}) {
    const [handle, setHandle] = useState("");
    const [state, action] = useFormState(updateUserHandleAction, initialState);

    useEffect(() => {
        if (state.submitted && state.ok && state.handle) {
            onHandleSet(state.handle);
        }
    }, [state.submitted, state.ok, state.handle, onHandleSet]);

    function handleClose() {
        setHandle("");
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <form action={action}>
                <DialogTitle>ユーザー部屋用ハンドルを設定</DialogTitle>
                <DialogContent>
                    <Typography
                        variant="body2"
                        color="text.secondary"
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
                    {state.submitted && !state.ok && (
                        <Alert
                            severity="error"
                            variant="outlined"
                            sx={{ mt: 1 }}
                        >
                            {state.message}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>キャンセル</Button>
                    <SubmitButton />
                </DialogActions>
            </form>
        </Dialog>
    );
}
