"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    InputAdornment,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { FormatListBulleted, Search } from "@mui/icons-material";
import { GameInfo } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useGameList } from "@/lib/client/useGameList";
import { SignInAlert } from "./sign-in-alert";

function Loading() {
    return (
        <TableRow>
            <TableCell colSpan={4}>
                <Skeleton variant="rounded" width="100%" />
            </TableCell>
        </TableRow>
    );
}

function NoResult() {
    const theme = useTheme();
    return (
        <TableRow>
            <TableCell colSpan={4}>
                <Typography
                    variant="body1"
                    color={theme.palette.text.secondary}
                    align="center"
                >
                    ゲームが見つかりませんでした
                </Typography>
            </TableCell>
        </TableRow>
    );
}

function GameTableCells({ list }: { list: GameInfo[] }) {
    const theme = useTheme();

    return list.map((game) => (
        <TableRow key={game.contentId} hover>
            <TableCell>
                <Stack direction="row" spacing={2}>
                    <Avatar
                        variant="square"
                        src={game.iconURL}
                        sx={{
                            width: 96,
                            height: 96,
                        }}
                    />
                    <Stack spacing={1}>
                        <Typography variant="body1">{game.title}</Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: theme.palette.text.secondary }}
                        >
                            {game.description}
                        </Typography>
                    </Stack>
                </Stack>
            </TableCell>
            <TableCell>
                <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                >
                    {format(game.createdAt, "yyyy/MM/dd")}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                >
                    {game.playCount} 回
                </Typography>
            </TableCell>
            <TableCell>
                <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    href={`/game/${game.id}/edit`}
                >
                    編集する
                </Button>
            </TableCell>
        </TableRow>
    ));
}

function GameList({ userId, keyword }: { userId: string; keyword?: string }) {
    const theme = useTheme();
    const [debouncedKeyword] = useDebounce(keyword, 500);
    const { isLoading, list, page, setPage, isEmpty, isEnd } = useGameList(
        debouncedKeyword,
        userId,
    );

    function handleClickMore() {
        setPage(page + 1);
    }

    return (
        <TableContainer component={Paper}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>ゲーム名</TableCell>
                        <TableCell>投稿日</TableCell>
                        <TableCell>プレイ数</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                {isLoading ? (
                    <TableBody>
                        <Loading />
                    </TableBody>
                ) : list == null || isEmpty ? (
                    <TableBody>
                        <NoResult />
                    </TableBody>
                ) : (
                    <TableBody>
                        <GameTableCells list={list.flat()} />
                        {!isEnd ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    sx={{ textAlign: "center" }}
                                >
                                    <Button
                                        onClick={handleClickMore}
                                        sx={{
                                            backgroundColor:
                                                theme.palette.background.paper,
                                        }}
                                        size="large"
                                    >
                                        もっと読む
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : null}
                    </TableBody>
                )}
            </Table>
        </TableContainer>
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
