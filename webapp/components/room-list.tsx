"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Container,
    Grid,
    Typography,
    useTheme,
} from "@mui/material";
import { Add, Person, AccessTime } from "@mui/icons-material";

const mockRoomList = [
    {
        contentId: "1",
        playId: "play1",
        contentName: "ゲーム名1",
        hostPlayer: "ユーザー1",
        currentPlayers: 2,
        createdAt: "5分前",
    },
    {
        contentId: "1",
        playId: "play2",
        contentName: "ゲーム名1",
        hostPlayer: "ゲスト",
        currentPlayers: 1,
        createdAt: "10分前",
    },
];

export function RoomList() {
    const theme = useTheme();
    const [rooms] = useState(mockRoomList);

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "start", sm: "center" },
                    justifyContent: "space-between",
                    mt: 1,
                    mb: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" component="h1">
                        ゲームで遊ぶ
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        現在プレイ中の部屋
                    </Typography>
                </Box>
                <Button
                    component={Link}
                    href="/create-play"
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                >
                    新しい部屋を作る
                </Button>
            </Box>
            <Grid container spacing={2}>
                {rooms.map((room) => (
                    <Grid
                        key={room.playId}
                        size={{
                            xs: 12,
                            sm: 6,
                            lg: 4,
                        }}
                    >
                        <Card
                            sx={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                transition: "all 0.2s",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: 6,
                                },
                            }}
                        >
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" component="h2">
                                    {room.contentName}
                                </Typography>
                                <Box
                                    sx={{
                                        width: 256,
                                        height: 256,
                                        border: 1,
                                        mt: 1,
                                    }}
                                />
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexWrap: {
                                            xs: "wrap",
                                        },
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        color: theme.palette.text.secondary,
                                        mt: 1,
                                    }}
                                >
                                    <Person />
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 1, mr: 2 }}
                                    >
                                        {room.currentPlayers}人
                                    </Typography>
                                    <AccessTime />
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 1, flexGrow: 1 }}
                                    >
                                        {room.createdAt}
                                    </Typography>
                                    <Typography variant="body2">
                                        部屋主: {room.hostPlayer}
                                    </Typography>
                                </Box>
                                <CardActions>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        component={Link}
                                        href={`/play/${room.playId}`}
                                        fullWidth
                                    >
                                        参加する
                                    </Button>
                                </CardActions>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}
