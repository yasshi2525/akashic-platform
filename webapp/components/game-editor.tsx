"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import {
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
import { FormatListBulleted, Search } from "@mui/icons-material";
import { GameInfo } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useGameList } from "@/lib/client/useGameList";
import { SignInAlert } from "./sign-in-alert";
import { GameListTable } from "./game-list-table";

function GameList({ userId, keyword }: { userId: string; keyword?: string }) {
    const [debouncedKeyword] = useDebounce(keyword, 500);
    const { isLoading, list, page, setPage, isEmpty, isEnd } = useGameList(
        debouncedKeyword,
        userId,
    );

    function handleClickMore() {
        setPage(page + 1);
    }

    return (
        <GameListTable
            list={list?.flat()}
            isLoading={isLoading}
            isEmpty={isEmpty}
            isEnd={isEnd}
            onLoadMore={handleClickMore}
            renderActions={(game: GameInfo) => (
                <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    href={`/game/${game.id}/edit`}
                >
                    編集する
                </Button>
            )}
        />
    );
}

export function GameEditor() {
    const [user] = useAuth();
    const [keyword, setKeyword] = useState("");

    if (!user || user.authType === "guest") {
        const message = `投稿したゲームを編集するにはサインインが必要です。`;
        return <SignInAlert message={message} />;
    }

    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        setKeyword(event.target.value);
    }

    return (
        <Container
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
                <Box sx={{ flex: 1 }} />
                <FormatListBulleted fontSize="large" />
                <Typography variant="h4" component="h1">
                    投稿したゲーム
                </Typography>
                <Box sx={{ flex: 1 }} />
            </Stack>
            <Card sx={{ width: "100%" }}>
                <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <Box>
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
                        <GameList userId={user.id} keyword={keyword} />
                    </Stack>
                </CardContent>
            </Card>
        </Container>
    );
}
