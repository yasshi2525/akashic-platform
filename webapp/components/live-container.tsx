"use client";

import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
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
    width,
}: {
    userId: string;
    name: string;
    iconURL?: string;
    isPlaying: boolean;
    width?: "narrow";
}) {
    const theme = useTheme();
    return (
        <>
            <Container maxWidth={width === "narrow" ? "sm" : "md"}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        borderColor: "divider",
                        justifyContent: "flex-start",
                        my: 1,
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
                    <Typography
                        variant="body1"
                        color={theme.palette.text.secondary}
                        sx={{ ml: 1 }}
                    >
                        さんの部屋
                    </Typography>
                    {isPlaying ? (
                        <Chip
                            label="ただいまプレイ中"
                            color="success"
                            size="small"
                            sx={{ ml: 1 }}
                        />
                    ) : (
                        <Chip
                            label="休憩中"
                            color="default"
                            size="small"
                            sx={{ ml: 1 }}
                        />
                    )}
                </Box>
            </Container>
            <Divider />
        </>
    );
}

export function LiveContainer({ handle }: { handle: string }) {
    const theme = useTheme();
    const [joinWord, setJoinWord] = useState("");
    const [submittedJoinWord, setSubmittedJoinWord] = useState<string>();
    /**
     * NOTE: プレイ中はポーリングさせたくないため、プレイ中かどうか判定するため記憶する。
     * NOTE: isPlaying の値を更新した際に再レンダリングさせたくないので useRef を使用する
     */
    const isPlaying = useRef(false);
    /**
     * NOTE: プレイが終わった直後、まだ data にはまだ情報が残っている。
     * NOTE: 直前の id を保持することで待機状態に遷移させる
     */
    const closedPlayId = useRef<number>(undefined);
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
        if (
            !data?.requiresJoinWord &&
            data?.info &&
            data.info.id !== closedPlayId.current
        ) {
            setCachedInfo(data.info);
            isPlaying.current = true;
        }
    }, [data]);

    function handlePlayEnd(_reason: PlayEndReason) {
        setCachedInfo(undefined);
        setJoinWord("");
        closedPlayId.current = cachedInfo?.id;
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
            <>
                <LiveHeader
                    userId={data.owner.userId}
                    name={data.owner.name}
                    iconURL={data.owner.iconURL}
                    isPlaying={true}
                    width="narrow"
                />
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
                                    onChange={(e) =>
                                        setJoinWord(e.target.value)
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
            </>
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
    if (!isPlaying.current) {
        return (
            <>
                <LiveHeader
                    userId={data.owner.userId}
                    name={data.owner.name}
                    iconURL={data.owner.iconURL}
                    isPlaying={false}
                    width="narrow"
                />
                <Container maxWidth="sm" sx={{ mt: 4 }}>
                    <Card>
                        <CardContent>
                            <Stack
                                spacing={2}
                                sx={{ alignItems: "center", py: 2 }}
                            >
                                <Typography variant="h6">
                                    {data.owner.name}{" "}
                                    さんは現在ゲームを起動していません
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color={theme.palette.text.secondary}
                                    sx={{ textAlign: "center" }}
                                >
                                    ゲーム開始までお待ちください。
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Container>
            </>
        );
    }
    if (!cachedInfo) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Alert severity="error" variant="outlined">
                    予期しないエラーが発生しました。画面を更新してください。
                </Alert>
            </Container>
        );
    }
    return (
        <>
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
        </>
    );
}
