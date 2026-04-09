"use client";

import { FormEvent, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
    Alert,
    Button,
    Card,
    CardContent,
    Container,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { usePlay } from "@/lib/client/usePlay";
import { useAuth } from "@/lib/client/useAuth";
import { PlayView } from "@/components/play-view";
import { ClosedPlayView } from "@/components/play-view-closed";

export function PlayContainer() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const inviteHash = searchParams.get("inviteHash") ?? undefined;
    const [joinWord, setJoinWord] = useState("");
    const [submittedJoinWord, setSubmittedJoinWord] = useState<string>();
    const { isLoading, data, error, requiresJoinWork } = usePlay(
        id,
        inviteHash,
        submittedJoinWord,
    );
    const [user] = useAuth();
    const container = useRef<HTMLDivElement>(null);

    function handleSubmitJoinWord(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmittedJoinWord(joinWord);
    }

    if (isLoading) {
        return (
            <Container>
                <Skeleton variant="rectangular" />
            </Container>
        );
    }
    if (requiresJoinWork) {
        return (
            <Container maxWidth="sm" sx={{ mt: 2 }}>
                <Card>
                    <CardContent>
                        <Stack
                            component="form"
                            spacing={2}
                            onSubmit={handleSubmitJoinWord}
                        >
                            {error && (
                                <Alert severity="error" variant="outlined">
                                    {error}
                                </Alert>
                            )}
                            <Typography variant="h6">
                                この部屋は限定公開です
                            </Typography>
                            <Typography variant="body2">
                                部屋一覧から入る場合は、部屋主が設定した入室の言葉が必要です。
                            </Typography>
                            <TextField
                                label="入室の言葉"
                                value={joinWord}
                                onChange={(event) =>
                                    setJoinWord(event.target.value)
                                }
                                autoFocus
                                fullWidth
                            />
                            <Button type="submit" variant="contained">
                                入室する
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Container>
        );
    }
    if (error || !data || !user) {
        return (
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Alert variant="outlined" severity="error">
                    {error ??
                        "予期しないエラーが発生しました。画面を更新してください。"}
                </Alert>
            </Container>
        );
    }
    if (!data.isActive) {
        return (
            <ClosedPlayView
                playName={data.playName}
                isLimited={data.isLimited}
                createdAt={data.createdAt}
                endedAt={data.endedAt}
                gameMaster={data.gameMaster}
                game={data.game}
                user={user ?? null}
            />
        );
    }
    return (
        <PlayView
            playId={id}
            playToken={data.playToken}
            playName={data.playName}
            isLimited={data.isLimited}
            joinWord={data.joinWord}
            inviteHash={data.inviteHash}
            isGameMaster={data.isGameMaster}
            contentWidth={data.width}
            contentHeight={data.height}
            contentExternal={data.external}
            createdAt={data.createdAt}
            remainingMs={data.remainingMs}
            expiresAt={data.expiresAt}
            gameMaster={data.gameMaster}
            game={data.game}
            user={user}
            ref={container}
        />
    );
}
