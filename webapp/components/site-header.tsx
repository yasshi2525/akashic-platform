"use client";

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
import { useAuth } from "@/lib/client/useAuth";
import { SignIn } from "./sign-in";

export function SiteHeader() {
    const theme = useTheme();
    const [user] = useAuth();

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
                                mr: 2,
                            }}
                        >
                            {user?.name}
                        </Typography>
                        {user?.authType !== "oauth" ? <SignIn /> : undefined}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
