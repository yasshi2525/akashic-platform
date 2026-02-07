"use client";

import { ChangeEvent, ReactNode, useState } from "react";
import { useDebounce } from "use-debounce";
import {
    Box,
    Card,
    CardContent,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { FormatListBulleted, Search } from "@mui/icons-material";
import { useGameList } from "@/lib/client/useGameList";
import { GameInfo } from "@/lib/types";
import { GameListTable } from "./game-list-table";

export function UserGameListSection({
    userId,
    title = "投稿したゲーム",
    renderActions,
}: {
    userId: string;
    title?: string;
    renderActions?: (game: GameInfo, isTable: boolean) => ReactNode;
}) {
    const [keyword, setKeyword] = useState("");
    const [debouncedKeyword] = useDebounce(keyword, 500);
    const { isLoading, list, page, setPage, isEmpty, isEnd } = useGameList(
        debouncedKeyword,
        userId,
    );

    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        setKeyword(event.target.value);
    }

    function handleClickMore() {
        setPage(page + 1);
    }

    return (
        <Stack spacing={2}>
            <Stack width="100%" direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }} />
                <FormatListBulleted fontSize="large" />
                <Typography variant="h4" component="h2">
                    {title}
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
                        <GameListTable
                            list={list?.flat()}
                            isLoading={isLoading}
                            isEmpty={!!isEmpty}
                            isEnd={!!isEnd}
                            onLoadMore={handleClickMore}
                            renderActions={renderActions}
                        />
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
}
