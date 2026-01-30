"use client";

import { MouseEvent, RefObject, TouchEvent, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
    Alert,
    Avatar,
    Button,
    Card,
    CardContent,
    Container,
    Snackbar,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { GameInfo, User } from "@/lib/types";
import { useAkashic } from "@/lib/client/useAkashic";
import { ResolvingPlayerInfoRequest } from "@/lib/client/akashic-plugins/coe-limited-plugin";
import { AkashicContainer } from "@/lib/client/akashic-container";
import { extendPlay } from "@/lib/server/play-extend";
import { PlayCloseDialog } from "./play-close-dialog";
import { PlayEndNotification } from "./play-end-notification";
import { PlayPlayerInfoResolver } from "./play-player-info-resolver";
import { CreditPanel } from "./credit-panel";
import { UserInline } from "./user-inline";

const warnings = ["EVENT_ON_SKIPPING"] as const;
type WarningType = (typeof warnings)[number];

const toMessage = (typ?: WarningType) => {
    if (!typ) {
        return undefined;
    }
    switch (typ) {
        case "EVENT_ON_SKIPPING":
            return "同期中です。しばらくお待ち下さい。";
        default:
            return "予期しないエラーが発生しました。時間をおいてリトライしてください。";
    }
};

// 次の理由によりシングルトンにしている
// 破棄に Promise が必要 → useEffect 内で破棄が完了しない
// 同時に2インスタンス存在するとロードがとまり、破棄に必要なステップを踏めない
const container = new AkashicContainer();
const EXTEND_WINDOW_MS = 10 * 60 * 1000;

export function PlayView({
    playId,
    playToken,
    playName,
    game,
    gameMaster,
    isGameMaster,
    contentWidth,
    contentHeight,
    createdAt,
    remainingMs: initialRemainingMs,
    expiresAt: initialExpiresAt,
    user,
    ref,
}: {
    playId: string;
    playToken: string;
    playName: string | null;
    game: GameInfo;
    gameMaster: {
        userId?: string;
        name: string;
        iconURL?: string;
    };
    isGameMaster: boolean;
    contentWidth: number;
    contentHeight: number;
    createdAt: Date;
    remainingMs: number;
    expiresAt: number;
    user: User;
    ref: RefObject<HTMLDivElement | null>;
}) {
    const theme = useTheme();
    const { playlogServerUrl } = useAkashic();
    const [skipping, setSkipping] = useState(false);
    const [warning, setWarning] = useState<WarningType>();
    const [error, setError] = useState<string>();
    const [playEndReason, setPlayEndReason] = useState<PlayEndReason>();
    const [requestPlayerInfo, setRequestPlayerInfo] =
        useState<ResolvingPlayerInfoRequest>();
    const [expiresAt, setExpiresAt] = useState<number | undefined>(
        initialExpiresAt,
    );
    const [remainingMs, setRemainingMs] = useState<number | undefined>(
        initialRemainingMs,
    );
    const [extendError, setExtendError] = useState<string>();
    const [extendLoading, setExtendLoading] = useState(false);

    function formatRemaining(ms: number | undefined) {
        if (ms == null) {
            return "--:--";
        }
        const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    function formatCreatedAt() {
        try {
            return format(new Date(createdAt), "yyyy/MM/dd HH:mm");
        } catch {
            return "--";
        }
    }

    function handleMouseEvent(ev: MouseEvent<HTMLDivElement>) {
        if (skipping) {
            ev.preventDefault();
            if (ev.type !== "mousemove") {
                setWarning("EVENT_ON_SKIPPING");
            }
        }
    }

    function handleTouchEvent(ev: TouchEvent<HTMLDivElement>) {
        if (skipping) {
            ev.preventDefault();
            setWarning("EVENT_ON_SKIPPING");
        }
    }

    function handleClose() {
        setWarning(undefined);
    }

    useEffect(() => {
        if (!ref.current) {
            return;
        }
        container.create({
            parent: ref.current,
            user,
            contentId: game.contentId,
            playId,
            playToken,
            playlogServerUrl,
            onSkip: setSkipping,
            onError: setError,
            onPlayEnd: setPlayEndReason,
            onPlayExtend: (payload) => {
                setExpiresAt(payload.expiresAt);
                setRemainingMs(payload.remainingMs);
            },
            onRequestPlayerInfo: setRequestPlayerInfo,
        });
        return () => {
            // Promiseだが、遅延終了しても影響なし
            container.destroy();
        };
    }, []);

    useEffect(() => {
        if (expiresAt == null) {
            return;
        }
        const intervalId = setInterval(() => {
            setRemainingMs(Math.max(expiresAt - Date.now(), 0));
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [expiresAt]);

    async function handleExtend() {
        if (extendLoading) {
            return;
        }
        setExtendLoading(true);
        setExtendError(undefined);
        try {
            const json = await extendPlay({ playId });
            if (json.ok) {
                setExpiresAt(json.expiresAt);
                setRemainingMs(json.remainingMs);
            } else if (json.reason === "TooEarly") {
                setExpiresAt(json.expiresAt);
                setRemainingMs(json.remainingMs);
                setExtendError("延長は残り10分以下から可能です。");
            } else {
                setExtendError("延長に失敗しました。");
            }
        } catch (err) {
            console.warn("failed to extend", err);
            setExtendError("延長に失敗しました。");
        } finally {
            setExtendLoading(false);
        }
    }

    return (
        <>
            <Container
                component="div"
                ref={ref}
                sx={{
                    aspectRatio: contentWidth / contentHeight,
                }}
                onMouseDown={handleMouseEvent}
                onMouseMove={handleMouseEvent}
                onMouseUp={handleMouseEvent}
                onTouchStart={handleTouchEvent}
                onTouchMove={handleTouchEvent}
                onTouchEnd={handleTouchEvent}
                onClick={handleMouseEvent}
            />
            {requestPlayerInfo ? (
                <PlayPlayerInfoResolver request={requestPlayerInfo} />
            ) : null}
            {isGameMaster ? <PlayCloseDialog playId={playId} /> : null}
            {playEndReason ? (
                <PlayEndNotification reason={playEndReason} />
            ) : null}
            {error ? (
                <Container maxWidth="md" sx={{ mt: 2 }}>
                    <Alert variant="filled" severity="error">
                        {error}
                    </Alert>
                </Container>
            ) : null}
            {warning ? (
                <Snackbar
                    open={!!warning}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    autoHideDuration={3000}
                    disableWindowBlurListener={true}
                    slotProps={{
                        clickAwayListener: {
                            onClickAway: (event) => {
                                (event as any).defaultMuiPrevented = true;
                            },
                        },
                    }}
                    onClose={handleClose}
                >
                    <Alert severity="warning">{toMessage(warning)}</Alert>
                </Snackbar>
            ) : null}
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Stack spacing={2}>
                    <Card>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                >
                                    <Avatar
                                        variant="square"
                                        src={game.iconURL}
                                        sx={{
                                            width: 120,
                                            height: 120,
                                        }}
                                    />
                                    <Stack spacing={1} sx={{ flex: 1 }}>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Typography
                                                variant="h5"
                                                component="h1"
                                            >
                                                {game.title}
                                            </Typography>
                                            {!game.streaming ? (
                                                <Typography
                                                    variant="body2"
                                                    color="error"
                                                >
                                                    実況不可
                                                </Typography>
                                            ) : null}
                                        </Stack>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                        <Typography
                                            variant="body2"
                                                color={
                                                    theme.palette.text.secondary
                                                }
                                        >
                                                制作者
                                        </Typography>
                                            <UserInline
                                                user={{
                                                    id: game.publisher.id,
                                                    name: game.publisher.name,
                                                    image: game.publisher.image,
                                                }}
                                                textVariant="body2"
                                                avatarSize={20}
                                                openInNewWindow
                                            />
                                        </Stack>
                                        <Typography
                                            variant="body1"
                                            sx={{ whiteSpace: "pre-wrap" }}
                                        >
                                            {game.description}
                                        </Typography>
                                        <CreditPanel
                                            credit={game.credit}
                                            contentId={game.contentId}
                                        />
                                    </Stack>
                                </Stack>
                                <Stack
                                    direction="row"
                                    justifyContent="flex-end"
                                >
                                    <Button
                                        component={Link}
                                        href={`/game/${game.contentId}#feedback`}
                                        variant="outlined"
                                    >
                                        このゲームの投稿者にフィードバックを送る
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    alignItems={{
                                        xs: "flex-start",
                                        sm: "center",
                                    }}
                                    justifyContent="space-between"
                                >
                                    <Stack spacing={1}>
                                        <Typography variant="h6">
                                            {playName}
                                        </Typography>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Typography variant="body2">
                                                部屋主
                                            </Typography>
                                            <UserInline
                                                user={{
                                                    id: gameMaster.userId,
                                                    name: gameMaster.name,
                                                    image: gameMaster.iconURL,
                                                }}
                                                textVariant="body2"
                                                avatarSize={32}
                                                openInNewWindow
                                            />
                                        </Stack>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            部屋作成: {formatCreatedAt()}
                                        </Typography>
                                    </Stack>
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={2}
                                        alignItems={{
                                            xs: "flex-start",
                                            sm: "center",
                                        }}
                                    >
                                        <Typography variant="body1">
                                            残り時間:{" "}
                                            {formatRemaining(remainingMs)}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            onClick={handleExtend}
                                            disabled={
                                                remainingMs == null ||
                                                remainingMs >
                                                    EXTEND_WINDOW_MS ||
                                                extendLoading
                                            }
                                        >
                                            30分延長する
                                        </Button>
                                    </Stack>
                                </Stack>
                                {extendError ? (
                                    <Alert severity="warning">
                                        {extendError}
                                    </Alert>
                                ) : null}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Container>
        </>
    );
}
