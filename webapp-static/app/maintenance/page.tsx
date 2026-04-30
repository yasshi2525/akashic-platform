"use client";

import { theme } from "@/lib/client/theme";
import { Container, Link, Stack, Typography } from "@mui/material";

export default function Maintenance() {
    return (
        <Container
            maxWidth="md"
            sx={{
                textAlign: "center",
            }}
        >
            <Typography
                variant="h4"
                component="h1"
                sx={{
                    py: 2,
                }}
            >
                ただいまメンテナンス中です。
            </Typography>
            <Typography variant="body1">
                現在、一時的にゲームプレイができない状態になっております。サービス再開までしばらくお待ち下さい。
            </Typography>
            <Stack
                direction="row"
                sx={{
                    justifyContent: "center",
                }}
                spacing={1}
            >
                <Typography variant="body1">最新情報は</Typography>
                <Link
                    href="https://x.com/yasshi2525"
                    target="_blank"
                    variant="body1"
                    sx={{
                        color: theme.palette.primary.light,
                    }}
                >
                    X (@yasshi2525)
                </Link>
                <Typography variant="body1">を参照してください。</Typography>
            </Stack>
        </Container>
    );
}
