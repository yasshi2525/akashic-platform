"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
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
import { ArrowBack, Search, SportsEsports } from "@mui/icons-material";
import { GameList } from "./game-list";

export function PlayForm() {
    const [selectedContent, setSelectedContent] = useState<number>();
    const [keyword, setKeyword] = useState("");

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
        </Container>
    );
}
