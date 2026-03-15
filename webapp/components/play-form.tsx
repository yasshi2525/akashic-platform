"use client";

import { ChangeEvent, useOptimistic, useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    FormControlLabel,
    InputAdornment,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { ArrowBack, Search, SportsEsports } from "@mui/icons-material";
import { messageKey, messages } from "@/lib/types";
import { registerPlay } from "@/lib/server/play-register";
import { useAuth } from "@/lib/client/useAuth";
import { GameList } from "./game-list";

export function PlayForm() {
    const [user] = useAuth();
    const [selectedContent, setSelectedContent] = useState<number>();
    const [selectedGameTitle, setSelectedGameTitle] = useState<string>();
    const [keyword, setKeyword] = useState("");
    const [playName, setPlayName] = useState("");
    const [isLimited, setIsLimited] = useState(false);
    const [joinWord, setJoinWord] = useState("");
    const [sending, setIsSending] = useOptimistic(false, () => true);
    const [error, setError] = useState<string>();

    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        setKeyword(event.target.value);
    }

    function handlePlayName(event: ChangeEvent<HTMLInputElement>) {
        setPlayName(event.target.value);
    }
    function handleJoinWord(event: ChangeEvent<HTMLInputElement>) {
        setJoinWord(event.target.value);
    }

    async function handleSubmit() {
        if (!selectedContent) {
            setError("ゲームを選択してください。");
        }
        if (!user) {
            setError("サインインしてください。");
        }
        if (selectedContent && user) {
            if (isLimited && !joinWord) {
                setError("限定部屋を作成する場合、入室の言葉が必要です。");
                return;
            }
            setIsSending(true);
            const res = await registerPlay({
                contentId: selectedContent,
                gameMasterId: user.id,
                gmUserId: user.authType !== "guest" ? user.id : undefined,
                playName,
                isLimited,
                joinWord,
            });
            if (res.ok) {
                const query = new URLSearchParams({
                    messageKey: messages.play.registerSuccessful,
                });
                if (isLimited) {
                    query.set("inviteHash", res.inviteHash!);
                }
                redirect(`/play/${res.playId}?${query.toString()}`);
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
                            "ゲスト状態で作成できる部屋数の上限に達しました。",
                        );
                        break;
                    case "InternalError":
                    default:
                        setError(
                            "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                        );
                        break;
                }
            }
            setIsSending(false);
        }
    }

    return (
        <Container
            component="form"
            action={handleSubmit}
            maxWidth="md"
            sx={{
                mt: 4,
                display: "flex",
                flexFlow: "column",
                alignItems: "center",
                gap: 4,
            }}
        >
            <Stack width="100%" direction="row" spacing={2} alignItems="center">
                <Button
                    component={Link}
                    href="/"
                    variant="text"
                    size="large"
                    startIcon={<ArrowBack fontSize="large" />}
                    sx={{ flex: 1, justifyContent: "start" }}
                />
                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <SportsEsports fontSize="large" />
                    <Typography variant="h4" component="h1">
                        部屋を作成する
                    </Typography>
                </Stack>
                <Box sx={{ flex: 1 }} />
            </Stack>
            <Card sx={{ width: "100%" }}>
                <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                部屋名
                            </Typography>
                            <TextField
                                placeholder={`例）「${selectedGameTitle ?? "〇〇ゲーム"}」で遊ぼう！`}
                                value={playName}
                                onChange={handlePlayName}
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 100,
                                    },
                                }}
                                helperText={`最大 100 文字`}
                            />
                        </Box>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                公開設定
                            </Typography>
                            <RadioGroup
                                value={isLimited ? "limited" : "public"}
                                onChange={(event) =>
                                    setIsLimited(
                                        event.target.value === "limited",
                                    )
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
                        </Box>
                        {isLimited ? (
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    入室の言葉
                                </Typography>
                                <TextField
                                    value={joinWord}
                                    onChange={handleJoinWord}
                                    fullWidth
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 100,
                                        },
                                    }}
                                    helperText="部屋一覧から入室するときに必要な言葉です。"
                                />
                            </Box>
                        ) : null}
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                ゲーム選択{" "}
                                <Typography component="span" color="error">
                                    *
                                </Typography>
                            </Typography>
                            <TextField
                                placeholder="ゲーム名で検索"
                                value={keyword}
                                onChange={handleSearch}
                                fullWidth
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </Box>
                        <GameList
                            keyword={keyword}
                            selected={selectedContent}
                            setSelected={setSelectedContent}
                            setGameTitle={setSelectedGameTitle}
                        />
                    </Stack>
                </CardContent>
            </Card>
            <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                color={!selectedContent ? "inherit" : "primary"}
                loading={sending}
                disabled={sending}
            >
                部屋を作成する
            </Button>
            {error ? (
                <Alert variant="outlined" severity="error" sx={{ mt: 1 }}>
                    {error}
                </Alert>
            ) : null}
        </Container>
    );
}
