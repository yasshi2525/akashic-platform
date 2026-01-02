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
    InputAdornment,
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
    const [keyword, setKeyword] = useState("");
    const [sending, setIsSending] = useOptimistic(false, () => true);
    const [error, setError] = useState<string>();

    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        setKeyword(event.target.value);
    }

    async function handleSubmit() {
        if (!selectedContent) {
            setError("ゲームを選択してください。");
        }
        if (!user) {
            setError("サインインしてください。");
        }
        if (selectedContent && user) {
            setIsSending(true);
            const res = await registerPlay({
                contentId: selectedContent,
                gameMasterId: user.id,
            });
            if (res.ok) {
                redirect(
                    `/play/${res.playId}?${messageKey}=${messages.play.registerSuccessful}`,
                );
            } else {
                switch (res.reason) {
                    case "InvalidParams":
                        setError(
                            "内部エラーが発生しました。入力内容を確認してもう一度投稿してください。",
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
