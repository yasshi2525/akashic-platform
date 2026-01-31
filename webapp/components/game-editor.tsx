"use client";

import Link from "next/link";
import { Button, Container, Stack, useTheme } from "@mui/material";
import { GameInfo } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { SignInAlert } from "./sign-in-alert";
import { UserGameListSection } from "./user-game-list-section";

export function GameEditor() {
    const theme = useTheme();
    const [user] = useAuth();

    if (!user || user.authType === "guest") {
        const message = `投稿したゲームを編集するにはサインインが必要です。`;
        return <SignInAlert message={message} />;
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
            <UserGameListSection
                userId={user.id}
                title="投稿したゲーム"
                renderActions={(game: GameInfo) => (
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            component={Link}
                            href={`/game/${game.id}`}
                            sx={{
                                borderColor: theme.palette.primary.light,
                                color: theme.palette.primary.light,
                            }}
                        >
                            詳細
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            component={Link}
                            href={`/game/${game.id}/edit`}
                        >
                            編集する
                        </Button>
                    </Stack>
                )}
            />
        </Container>
    );
}
