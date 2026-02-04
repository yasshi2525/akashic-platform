"use client";

import {
    Box,
    Container,
    Link,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";

export function SiteFooter() {
    const theme = useTheme();

    return (
        <Box
            component="footer"
            sx={{
                borderTop: 1,
                bgcolor: theme.palette.background.paper,
                borderColor: theme.palette.background.default,
            }}
        >
            <Container maxWidth="xl">
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{
                        xs: 0,
                        sm: 1,
                    }}
                    sx={{
                        textAlign: "center",
                        justifyContent: "center",
                        color: theme.palette.text.secondary,
                    }}
                >
                    <Typography variant="body2">
                        © 2026 みんなでゲーム! All rights reserved.
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: "center" }}>
                        <Link href="/terms" color="inherit" variant="body2">
                            利用規約
                        </Link>
                        <Typography variant="body2"> / </Typography>
                        <Link href="/privacy" color="inherit" variant="body2">
                            プライバシーポリシー
                        </Link>
                        <Typography variant="body2"> | </Typography>
                        <Typography variant="body2">
                            問い合わせ: やっしー
                        </Typography>
                        <Link
                            href="https://x.com/yasshi2525"
                            target="_blank"
                            color="inherit"
                            variant="body2"
                        >
                            X
                        </Link>
                        <Typography variant="body2">, </Typography>
                        <Link
                            href="https://github.com/yasshi2525/akashic-platform"
                            target="_blank"
                            color="inherit"
                            variant="body2"
                        >
                            GitHub
                        </Link>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}
