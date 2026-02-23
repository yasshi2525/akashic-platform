"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { Alert, Container, Skeleton } from "@mui/material";
import { usePlay } from "@/lib/client/usePlay";
import { useAuth } from "@/lib/client/useAuth";
import { PlayView } from "@/components/play-view";

export function PlayContainer() {
    const { id } = useParams<{ id: string }>();
    const { isLoading, data, error } = usePlay(id);
    const [user] = useAuth();
    const container = useRef<HTMLDivElement>(null);

    if (isLoading) {
        return (
            <Container>
                <Skeleton variant="rectangular" />
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

    return (
        <PlayView
            playId={id}
            playToken={data.playToken}
            playName={data.playName}
            isGameMaster={data.isGameMaster}
            contentWidth={data.contentWidth}
            contentHeight={data.contentHeight}
            contentExternal={data.contentExternal}
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
