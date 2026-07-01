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
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { GameInfo, messageKey, messages, User } from "@/lib/types";
import { registerPlay } from "@/lib/server/play-register";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/client/useLocalStorage";

export function PlayCreateDialog({
    open,
    onClose,
    game,
    user,
    afterCreate,
}: {
    open: boolean;
    onClose: () => void;
    game?: GameInfo;
    user: User | null;
    afterCreate: { action: "navigate" } | { action: "stay"; cb: () => void };
}) {
    const router = useRouter();
    const [playName, setPlayName] = useLocalStorage(STORAGE_KEYS.ROOM_NAME, "");
    const [isLimited, setIsLimited] = useLocalStorage(
        STORAGE_KEYS.ROOM_IS_LIMITED,
        false,
    );
    const [joinWord, setJoinWord] = useLocalStorage(
        STORAGE_KEYS.ROOM_JOIN_WORD,
        "",
    );
    const [requireSignIn, setRequireSignIn] = useLocalStorage(
        STORAGE_KEYS.ROOM_REQUIRE_SIGN_IN,
        false,
    );
    const canRequireSignIn = !!user && user.authType !== "guest";
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (open) {
            // playName / isLimited / joinWord は前回入力値を引き継ぐため意図的にリセットしない
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
        if (isLimited && !joinWord) {
            setError("限定部屋を作成する場合、入室の言葉が必要です。");
            return;
        }
        setSending(true);
        const res = await registerPlay({
            contentId: game.contentId,
            gameMasterId: user.id,
            gmUserId: user.authType !== "guest" ? user.id : undefined,
            playName,
            isLimited,
            joinWord,
            requireSignIn: canRequireSignIn && requireSignIn,
        });
        if (res.ok) {
            switch (afterCreate.action) {
                case "navigate":
                    router.push(
                        `/play/${res.playId}?${messageKey}=${messages.play.registerSuccessful}`,
                    );
                    break;
                case "stay":
                    afterCreate.cb();
                    break;
                default:
                    console.error(
                        "invalid afterCreate action type",
                        afterCreate,
                    );
                    break;
            }
        } else {
            switch (res.reason) {
                case "InvalidParams":
                    setError(
                        "内部エラーが発生しました。入力内容を確認してもう一度投稿してください。",
                    );
                    break;
                case "Drain":
                    setError(
                        "現在臨時メンテナンス中のため、部屋を作成できません。1時間ほど時間をおいてください。",
                    );
                    break;
                case "GuestRoomLimitExceeded":
                    setError(
                        "ゲスト状態が作成できる部屋数の上限に達しました。",
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
                    <Stack spacing={1}>
                        <Typography variant="subtitle1">公開設定</Typography>
                        <RadioGroup
                            value={isLimited ? "limited" : "public"}
                            onChange={(event) =>
                                setIsLimited(event.target.value === "limited")
                            }
                        >
                            <FormControlLabel
                                value="public"
                                control={<Radio />}
                                label="公開: 部屋一覧から誰でもそのまま入室できます。"
                            />
                            <FormControlLabel
                                value="limited"
                                control={<Radio />}
                                label="限定: 部屋一覧には表示されますが、入室の言葉がないと入れません。"
                            />
                        </RadioGroup>
                    </Stack>
                    {isLimited && (
                        <TextField
                            label="入室の言葉"
                            value={joinWord}
                            onChange={(event) =>
                                setJoinWord(event.target.value)
                            }
                            fullWidth
                            slotProps={{
                                htmlInput: {
                                    maxLength: 100,
                                },
                            }}
                            helperText="部屋一覧から入室するときに必要な言葉です。"
                        />
                    )}
                    <Stack spacing={0.5}>
                        <Typography variant="subtitle1">参加者設定</Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={canRequireSignIn && requireSignIn}
                                    onChange={(event) =>
                                        setRequireSignIn(event.target.checked)
                                    }
                                    disabled={!canRequireSignIn}
                                />
                            }
                            label="ゲスト参加を禁止"
                        />
                        <Typography variant="body2" color="textSecondary">
                            {canRequireSignIn
                                ? "有効にすると、サインインしたユーザーのみ参加でき、ユーザー名が固定で表示されます。"
                                : "この設定を利用するにはサインインが必要です。"}
                        </Typography>
                    </Stack>
                    {error && (
                        <Alert variant="outlined" severity="error">
                            {error}
                        </Alert>
                    )}
                </Stack>
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
            </DialogContent>
        </Dialog>
    );
}
