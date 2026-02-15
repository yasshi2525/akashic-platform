"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from "@mui/material";
import { GameInfo, messageKey, messages, User } from "@/lib/types";
import { registerPlay } from "@/lib/server/play-register";

export function PlayCreateDialog({
    open,
    onClose,
    game,
    user,
}: {
    open: boolean;
    onClose: () => void;
    game?: GameInfo;
    user: User | null;
}) {
    const router = useRouter();
    const [playName, setPlayName] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (open) {
            setPlayName("");
            setError(undefined);
            setSending(false);
        }
    }, [open, game?.contentId]);

    async function handleSubmit() {
        if (!game) {
            setError("ゲームが見つかりません。");
            return;
        }
        if (!user) {
            setError("サインインしてください。");
            return;
        }
        setSending(true);
        const res = await registerPlay({
            contentId: game.contentId,
            gameMasterId: user.id,
            gmUserId: user.authType !== "guest" ? user.id : undefined,
            playName,
        });
        if (res.ok) {
            router.push(
                `/play/${res.playId}?${messageKey}=${messages.play.registerSuccessful}`,
            );
        } else {
            switch (res.reason) {
                case "InvalidParams":
                    setError(
                        "内部エラーが発生しました。入力内容を確認してもう一度投稿してください。",
                    );
                    break;
                case "Shutdown":
                    setError(
                        "現在メンテナンス中のため、部屋を作成できません。",
                    );
                    break;
                case "InternalError":
                default:
                    setError(
                        "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                    );
                    break;
            }
            setSending(false);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>部屋を作成する</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="部屋名"
                        placeholder={`例）「${game?.title ?? "〇〇ゲーム"}」で遊ぼう！`}
                        value={playName}
                        onChange={(event) => setPlayName(event.target.value)}
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                maxLength: 100,
                            },
                        }}
                        helperText="最大 100 文字"
                    />
                    {error ? (
                        <Alert variant="outlined" severity="error">
                            {error}
                        </Alert>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={sending}
                >
                    作成する
                </Button>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onClose}
                    disabled={sending}
                >
                    キャンセル
                </Button>
            </DialogActions>
        </Dialog>
    );
}
