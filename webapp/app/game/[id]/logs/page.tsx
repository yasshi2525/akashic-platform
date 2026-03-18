"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Pagination,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import { useAuth } from "@/lib/client/useAuth";
import { useGame } from "@/lib/client/useGame";
import { useGamePlays } from "@/lib/client/useGamePlays";
import { PlayLogEntry, PlayLogInfo, PLAY_LOG_LIMITS } from "@/lib/types";

function PlayErrorDetails({
    contentId,
    playId,
}: {
    contentId: number;
    playId: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState<PlayLogEntry[] | null>(null);
    const [fetchError, setFetchError] = useState<string>();

    async function handleToggle() {
        if (!expanded && entries === null && !loading) {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/game-log/${contentId}/${playId}?filter=error`,
                );
                if (res.status === 404) {
                    setEntries([]);
                } else if (!res.ok) {
                    throw new Error(res.statusText);
                } else {
                    const text = await res.text();
                    const parsed = text
                        .split("\n")
                        .filter((l) => l.trim())
                        .map((l) => JSON.parse(l) as PlayLogEntry);
                    setEntries(parsed);
                }
            } catch {
                setFetchError("エラーログの取得に失敗しました。");
            } finally {
                setLoading(false);
            }
        }
        setExpanded((prev) => !prev);
    }

    return (
        <Box>
            <Button size="small" onClick={handleToggle} sx={{ pl: 0 }}>
                {expanded ? "▲ エラーログを隠す" : "▼ エラーログを表示"}
            </Button>
            {expanded && (
                <Box sx={{ mt: 1 }}>
                    {loading && <CircularProgress size={20} />}
                    {fetchError && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {fetchError}
                        </Alert>
                    )}
                    {entries != null && entries.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            エラーログはありません。
                        </Typography>
                    )}
                    {entries?.map((entry, i) => (
                        <Box key={i} sx={{ mb: 2 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                            >
                                {new Date(entry.timestamp).toLocaleString(
                                    "ja-JP",
                                )}
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    m: 0,
                                    p: 1,
                                    bgcolor: "grey.100",
                                    borderRadius: 1,
                                    fontSize: "0.8rem",
                                    fontFamily: "monospace",
                                }}
                            >
                                {entry.message}
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

function PlayLogCard({ play }: { play: PlayLogInfo }) {
    const hasError = play.crashed || play.errorLogged;

    return (
        <Box
            id={`play-${play.id}`}
            sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}
        >
            <Stack spacing={1}>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                >
                    <Typography variant="subtitle1" fontWeight="bold">
                        {play.name}
                    </Typography>
                    {play.crashed && (
                        <Chip label="クラッシュ" color="error" size="small" />
                    )}
                    {!play.crashed && play.errorLogged && (
                        <Chip
                            label="エラーあり"
                            color="warning"
                            size="small"
                        />
                    )}
                    {!hasError && (
                        <Chip
                            label="エラーなし"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    {play.gameMaster.iconURL && (
                        <Avatar
                            src={play.gameMaster.iconURL}
                            sx={{ width: 20, height: 20 }}
                        />
                    )}
                    <Typography variant="body2" color="text.secondary">
                        {play.gameMaster.name}
                    </Typography>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        開始:{" "}
                        {new Date(play.createdAt).toLocaleString("ja-JP")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        終了:{" "}
                        {play.endedAt
                            ? new Date(play.endedAt).toLocaleString("ja-JP")
                            : "-"}
                    </Typography>
                </Stack>

                {hasError && (
                    <PlayErrorDetails
                        contentId={play.contentId}
                        playId={play.id}
                    />
                )}

                {play.logUploadedAt ? (
                    <Button
                        variant="text"
                        size="small"
                        href={`/api/game-log/${play.contentId}/${play.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ alignSelf: "flex-start", pl: 0 }}
                    >
                        全ログをダウンロード
                    </Button>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        ログ準備中...
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

export default function GameLogs() {
    const { id } = useParams<{ id: string }>();
    const [user] = useAuth();
    const { isLoading: isGameLoading, gameInfo, error: gameError } = useGame(id);
    const [page, setPage] = useState(0);
    const {
        isLoading: isPlaysLoading,
        plays,
        total,
        error: playsError,
    } = useGamePlays(id, page);

    const isPublisher = useMemo(() => {
        if (!user || user.authType !== "oauth" || !gameInfo) return false;
        return user.id === gameInfo.publisher.id;
    }, [user, gameInfo]);

    if (isGameLoading) {
        return (
            <Container maxWidth="md" sx={{ py: 2 }}>
                <Skeleton variant="rectangular" height={240} />
            </Container>
        );
    }

    if (gameError || !gameInfo) {
        return (
            <Container maxWidth="md" sx={{ py: 2 }}>
                <Alert severity="error" variant="outlined">
                    {gameError ?? "読み込みに失敗しました。"}
                </Alert>
            </Container>
        );
    }

    if (!isPublisher) {
        return (
            <Container maxWidth="md" sx={{ py: 2 }}>
                <Alert severity="error" variant="outlined">
                    このページにはアクセスできません。
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
                {gameInfo.title} - ログ一覧
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
                終了したプレイのみ表示されます。ログの反映には若干時間がかかる場合があります。
            </Alert>

            {playsError && (
                <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
                    {playsError}
                </Alert>
            )}

            {isPlaysLoading ? (
                <Stack spacing={2}>
                    <Skeleton variant="rectangular" height={120} />
                    <Skeleton variant="rectangular" height={120} />
                </Stack>
            ) : plays.length === 0 ? (
                <Typography color="text.secondary">
                    ログはまだありません。
                </Typography>
            ) : (
                <Stack spacing={2}>
                    {plays.map((play) => (
                        <PlayLogCard key={play.id} play={play} />
                    ))}
                    {total > PLAY_LOG_LIMITS && (
                        <Pagination
                            count={Math.ceil(total / PLAY_LOG_LIMITS)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            sx={{ alignSelf: "center" }}
                        />
                    )}
                </Stack>
            )}
        </Container>
    );
}
