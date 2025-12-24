"use client";

import { useState } from "react";
import Link from "next/link";
import {
    AppBar,
    Avatar,
    Box,
    colors,
    Container,
    Toolbar,
    Typography,
    useTheme,
} from "@mui/material";

const mockUser = {
    playerId: "user1",
    playerName: "プレイヤー1",
};

export function SiteHeader() {
    const theme = useTheme();
    const [user] = useState(mockUser);

    return (
        <AppBar
            position="sticky"
            component="header"
            sx={{
                borderBottom: 1,
                borderColor: theme.palette.background.default,
            }}
        >
            <Container maxWidth="xl">
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Link
                        href="/"
                        style={{ textDecoration: "none", color: "inherit" }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 2,
                            }}
                        >
                            <Typography variant="h4" component="span">
                                みんなでゲーム!
                            </Typography>
                            <Typography
                                sx={{
                                    display: { xs: "none", md: "inline" },
                                }}
                                variant="subtitle1"
                                component="span"
                            >
                                自作ゲームが遊べる・投稿できる
                            </Typography>
                        </Box>
                    </Link>
                    <Box
                        sx={{
                            display: {
                                alignItems: "center",
                                gap: 2,
                                xs: "none",
                                sm: "flex",
                            },
                        }}
                    >
                        <Avatar
                            sx={{
                                bgcolor: colors.deepOrange[500],
                            }}
                        >
                            Y
                        </Avatar>
                        <Typography
                            variant="body1"
                            sx={{
                                color: theme.palette.text.secondary,
                            }}
                        >
                            {user.playerName}
                        </Typography>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
