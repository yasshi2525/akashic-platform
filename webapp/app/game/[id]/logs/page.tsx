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
    useTheme,
} from "@mui/material";
import {
    ContentLogEntry,
    ContentLogInfo,
    CONTENT_LOG_LIMITS,
} from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useGame } from "@/lib/client/useGame";
import { useGamePlays } from "@/lib/client/useGamePlays";

function PlayErrorDetails({
    contentId,
    playId,
}: {
    contentId: number;
    playId: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState<ContentLogEntry[] | null>(null);
    const [fetchError, setFetchError] = useState<string>();

    async function handleToggle() {
        if (!expanded && entries === null && !loading) {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/content/${contentId}/play/${playId}/logs?filter=error`,
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
                        .map((l) => JSON.parse(l) as ContentLogEntry);
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

function ContentLogCard({ play }: { play: ContentLogInfo }) {
    const theme = useTheme();
    const hasError = play.crashed || play.errorLogged;

    return (
        <Box
            id={`play-${play.id}`}
            sx={{
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: 1,
                p: 2,
            }}
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
                        <Chip label="強制終了" color="error" size="small" />
                    )}
                    {!play.crashed && play.errorLogged && (
                        <Chip label="エラーあり" color="warning" size="small" />
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
                    <Typography
                        variant="body2"
                        color={theme.palette.text.secondary}
                    >
                        {play.gameMaster.name}
                    </Typography>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Typography
                        variant="body2"
                        color={theme.palette.text.secondary}
                    >
                        開始: {new Date(play.createdAt).toLocaleString("ja-JP")}
                    </Typography>
                    <Typography
                        variant="body2"
                        color={theme.palette.text.secondary}
                    >
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
                        href={`/api/content/${play.contentId}/play/${play.id}/logs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ alignSelf: "flex-start", pl: 0 }}
                    >
                        全ログをダウンロード
                    </Button>
                ) : (
                    <Typography
                        variant="body2"
                        color={theme.palette.text.secondary}
                    >
                        ログ準備中...
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

export default function ContentLogs() {
    const { id } = useParams<{ id: string }>();
    const theme = useTheme();
    const [user] = useAuth();
    const {
        isLoading: isGameLoading,
        gameInfo,
        error: gameError,
    } = useGame(id);
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
                    このページへのアクセス権がありません。
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
                終了した部屋のログのみ表示されます。反映には若干時間がかかります。
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
                <Typography color={theme.palette.text.secondary}>
                    まだログがありません。
                </Typography>
            ) : (
                <Stack spacing={2}>
                    {plays.map((play) => (
                        <ContentLogCard key={play.id} play={play} />
                    ))}
                    {total > CONTENT_LOG_LIMITS && (
                        <Pagination
                            count={Math.ceil(total / CONTENT_LOG_LIMITS)}
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
