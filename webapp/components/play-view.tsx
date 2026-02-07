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
    Divider,
    IconButton,
    Slider,
    Snackbar,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import {
    ContentCopy,
    OpenInNew,
    VolumeOff,
    VolumeUp,
} from "@mui/icons-material";
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

const MASTER_VOLUME_MAX = 0.4;

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
    const [inviteUrl, setInviteUrl] = useState<string>();
    const [inviteCopyStatus, setInviteCopyStatus] = useState<
        "success" | "error"
    >();
    const [volumePercent, setVolumePercent] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [prevVolumePercent, setPrevVolumePercent] = useState(100);

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
            initialMasterVolume: MASTER_VOLUME_MAX,
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

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const currentUrl = new URL(window.location.href);
        setInviteUrl(`${currentUrl.origin}${currentUrl.pathname}`);
    }, [playId]);

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

    async function handleCopyInvite() {
        if (!inviteUrl) {
            return;
        }
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setInviteCopyStatus("success");
        } catch (err) {
            console.warn("failed to copy invite url", err);
            setInviteCopyStatus("error");
        }
    }

    function handleVolumeChange(_event: Event, value: number | number[]) {
        const nextPercent = Array.isArray(value) ? value[0] : value;
        setVolumePercent(nextPercent);
        setIsMuted(nextPercent === 0);
        if (nextPercent > 0) {
            setPrevVolumePercent(nextPercent);
        }
        const nextVolume = (nextPercent / 100) * MASTER_VOLUME_MAX;
        container.setMasterVolume(nextVolume);
    }

    function handleToggleMute() {
        if (isMuted || volumePercent === 0) {
            const restoredPercent =
                prevVolumePercent > 0 ? prevVolumePercent : 100;
            setVolumePercent(restoredPercent);
            setIsMuted(false);
            const nextVolume = (restoredPercent / 100) * MASTER_VOLUME_MAX;
            container.setMasterVolume(nextVolume);
            return;
        }
        setPrevVolumePercent(volumePercent);
        setVolumePercent(0);
        setIsMuted(true);
        container.setMasterVolume(0);
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
            {inviteCopyStatus ? (
                <Snackbar
                    open={!!inviteCopyStatus}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    autoHideDuration={2500}
                    onClose={() => setInviteCopyStatus(undefined)}
                >
                    <Alert
                        severity={
                            inviteCopyStatus === "success" ? "success" : "error"
                        }
                    >
                        {inviteCopyStatus === "success"
                            ? "招待リンクをコピーしました。"
                            : "クリップボードへのコピーに失敗しました。"}
                    </Alert>
                </Snackbar>
            ) : null}
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Stack spacing={2}>
                    <Card>
                        <CardContent>
                            <Stack spacing={1} divider={<Divider />}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
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
                                            <Typography
                                                variant="body2"
                                                color={
                                                    theme.palette.text.secondary
                                                }
                                            >
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
                                        <Stack direction="row">
                                            <Typography
                                                variant="body2"
                                                color={
                                                    theme.palette.text.secondary
                                                }
                                            >
                                                作成
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color={
                                                    theme.palette.text.secondary
                                                }
                                            >
                                                {formatCreatedAt()}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                    <Stack
                                        alignItems={{
                                            xs: "flex-start",
                                            sm: "center",
                                        }}
                                    >
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            sx={{
                                                width: "100%",
                                                pr: 1,
                                            }}
                                        >
                                            <IconButton
                                                onClick={handleToggleMute}
                                                aria-label={
                                                    isMuted ||
                                                    volumePercent === 0
                                                        ? "ミュート解除"
                                                        : "ミュート"
                                                }
                                            >
                                                {isMuted ||
                                                volumePercent === 0 ? (
                                                    <VolumeOff fontSize="large" />
                                                ) : (
                                                    <VolumeUp fontSize="large" />
                                                )}
                                            </IconButton>
                                            <Slider
                                                value={volumePercent}
                                                onChange={handleVolumeChange}
                                                aria-label="音量"
                                            />
                                        </Stack>
                                        <Stack
                                            alignItems="center"
                                            direction="row"
                                            gap={1}
                                        >
                                            <Stack direction="row" spacing={2}>
                                                <Typography
                                                    variant="body1"
                                                    color={
                                                        theme.palette.text
                                                            .secondary
                                                    }
                                                >
                                                    終了まで
                                                </Typography>
                                                <Typography variant="body1">
                                                    {formatRemaining(
                                                        remainingMs,
                                                    )}
                                                </Typography>
                                            </Stack>
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
                                </Stack>
                                {extendError ? (
                                    <Alert severity="warning">
                                        {extendError}
                                    </Alert>
                                ) : null}
                                <Stack spacing={1}>
                                    <Typography variant="body1">
                                        招待リンク
                                    </Typography>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                    >
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                p: 1,
                                                color: theme.palette.text
                                                    .secondary,
                                                borderStyle: "solid",
                                                borderWidth: 1,
                                                borderRadius: 2,
                                                borderColor:
                                                    theme.palette.divider,
                                                backgroundColor:
                                                    theme.palette.background
                                                        .default,
                                                cursor: "pointer",
                                                flexGrow: 1,
                                            }}
                                            onClick={handleCopyInvite}
                                        >
                                            {inviteUrl ?? "リンクを準備中..."}
                                        </Typography>
                                        <Button
                                            startIcon={<ContentCopy />}
                                            variant="outlined"
                                            onClick={handleCopyInvite}
                                            disabled={!inviteUrl}
                                            sx={{
                                                borderColor:
                                                    theme.palette.primary.light,
                                                color: theme.palette.primary
                                                    .light,
                                            }}
                                        >
                                            コピー
                                        </Button>
                                    </Stack>
                                    <Typography
                                        variant="body2"
                                        color={theme.palette.text.secondary}
                                    >
                                        この部屋に招待したい人に上のリンクを共有してください。
                                    </Typography>
                                </Stack>
                                {isGameMaster ? (
                                    <Stack sx={{ justifyContent: "center" }}>
                                        <PlayCloseDialog playId={playId} />
                                    </Stack>
                                ) : null}
                            </Stack>
                        </CardContent>
                    </Card>
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
                                        href={`/game/${game.id}#feedback`}
                                        target="_blank"
                                        variant="outlined"
                                        endIcon={<OpenInNew />}
                                        sx={{
                                            borderColor:
                                                theme.palette.primary.light,
                                            color: theme.palette.primary.light,
                                        }}
                                    >
                                        このゲームの投稿者にフィードバックを送る
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Container>
        </>
    );
}
