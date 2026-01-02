"use client";

import Link from "next/link";
import {
    AppBar,
    Box,
    Container,
    Toolbar,
    Typography,
    useTheme,
} from "@mui/material";
import { useAuth } from "@/lib/client/useAuth";
import { UserMenu } from "./user-menu";

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
                    <UserMenu />
                </Toolbar>
            </Container>
        </AppBar>
    );
}
