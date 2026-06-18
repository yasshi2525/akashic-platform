"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Skeleton,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { ActiveLiveInfo } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useLive } from "@/lib/client/useLive";
import { PlayView } from "./play-view";
import { UserInline } from "./user-inline";

function LiveHeader({
    userId,
    name,
    iconURL,
    isPlaying,
}: {
    userId: string;
    name: string;
    iconURL?: string;
    isPlaying: boolean;
}) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
            }}
        >
            <UserInline
                user={{
                    id: userId,
                    name: name,
                    image: iconURL,
                }}
                textVariant="body1"
                avatarSize={24}
            />
            <Typography variant="body1" sx={{ ml: 1 }}>
                さんの部屋
            </Typography>
            {isPlaying ? (
                <Chip
                    label="ただいまプレイ中"
                    color="error"
                    size="small"
                    sx={{ ml: "auto" }}
                />
            ) : (
                <Chip
                    label="休憩中"
                    color="default"
                    size="small"
                    sx={{ ml: "auto" }}
                />
            )}
        </Box>
    );
}

export function LiveContainer({ handle }: { handle: string }) {
    const theme = useTheme();
    const [joinWord, setJoinWord] = useState("");
    const [submittedJoinWord, setSubmittedJoinWord] = useState<string>();
    /**
     * Note: プレイ中はポーリングさせたくないため記録。更新時に再レンダリングさせないためにuseRef
     */
    const isPlaying = useRef(false);
    const [cachedInfo, setCachedInfo] = useState<ActiveLiveInfo>();
    const [user] = useAuth();
    const container = useRef<HTMLDivElement>(null);

    const { isLoading, data, error } = useLive(
        handle,
        submittedJoinWord,
        !isPlaying.current,
    );
    useEffect(() => {
        if (isPlaying.current) {
            return;
        }
        if (!data?.requiresJoinWord && data?.info) {
            setCachedInfo(data.info);
            isPlaying.current = true;
        }
    }, [data]);

    function handlePlayEnd(_reason: PlayEndReason) {
        setCachedInfo(undefined);
        setJoinWord("");
        setSubmittedJoinWord(undefined);
        isPlaying.current = false;
    }

    function handleSubmitJoinWord(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmittedJoinWord(joinWord);
    }

    if (isLoading) {
        return (
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: "divider",
                    }}
                >
                    <Skeleton variant="circular" width={36} height={36} />
                    <Skeleton variant="text" width={120} />
                </Box>
                <Skeleton variant="rectangular" height={400} sx={{ mt: 1 }} />
            </Container>
        );
    }
    if (data?.requiresJoinWord) {
        return (
            <Container maxWidth="sm" sx={{ mt: 2 }}>
                <LiveHeader
                    userId={data.owner.userId}
                    name={data.owner.name}
                    iconURL={data.owner.iconURL}
                    isPlaying={true}
                />
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
                            {submittedJoinWord && (
                                <Alert severity="error" variant="outlined">
                                    入室の言葉が正しくありません。
                                </Alert>
                            )}
                            <Typography variant="h6">
                                ただいま限定公開設定でプレイしています。
                            </Typography>
                            <Typography variant="body2">
                                ゲームに参加するには入室の言葉が必要です。
                            </Typography>
                            <TextField
                                label="入室の言葉"
                                value={joinWord}
                                onChange={(e) => setJoinWord(e.target.value)}
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
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Alert severity="error" variant="outlined">
                    {error ??
                        "予期しないエラーが発生しました。画面を更新してください。"}
                </Alert>
            </Container>
        );
    }
    if (!data.info) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <LiveHeader
                    userId={data.owner.userId}
                    name={data.owner.name}
                    iconURL={data.owner.iconURL}
                    isPlaying={false}
                />
                <Card>
                    <CardContent>
                        <Stack spacing={2} sx={{ alignItems: "center", py: 2 }}>
                            <Typography variant="h6">
                                現在ゲームを起動していません
                            </Typography>
                            <Typography
                                variant="body2"
                                color={theme.palette.text.secondary}
                                sx={{ textAlign: "center" }}
                            >
                                ゲーム開始までお待ちください。
                            </Typography>
                            <CircularProgress size={24} />
                        </Stack>
                    </CardContent>
                </Card>
            </Container>
        );
    }
    if (!cachedInfo) {
        return (
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Alert severity="error" variant="outlined">
                    予期しないエラーが発生しました。画面を更新してください。
                </Alert>
            </Container>
        );
    }
    return (
        <Box>
            <LiveHeader
                userId={data.owner.userId}
                name={data.owner.name}
                iconURL={data.owner.iconURL}
                isPlaying={true}
            />
            <PlayView
                key={cachedInfo.id}
                playId={`${cachedInfo.id}`}
                playToken={cachedInfo.playToken}
                playName={cachedInfo.playName}
                isLimited={cachedInfo.isLimited}
                joinWord={cachedInfo.joinWord}
                inviteHash={cachedInfo.inviteHash}
                game={cachedInfo.game}
                gameMaster={cachedInfo.gameMaster}
                isGameMaster={data.isGameMaster}
                contentWidth={cachedInfo.width}
                contentHeight={cachedInfo.height}
                contentExternal={cachedInfo.external}
                createdAt={cachedInfo.createdAt}
                remainingMs={cachedInfo.remainingMs}
                expiresAt={cachedInfo.expiresAt}
                user={user}
                onPlayEnd={handlePlayEnd}
                ref={container}
            />
        </Box>
    );
}
