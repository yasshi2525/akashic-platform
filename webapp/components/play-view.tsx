"use client";

import { MouseEvent, RefObject, TouchEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Container, Snackbar, Stack } from "@mui/material";
import type { PlayEndReason } from "@yasshi2525/amflow-client-event-schema";
import { User } from "@/lib/types";
import { useAkashic } from "@/lib/client/useAkashic";
import { ResolvingPlayerInfoRequest } from "@/lib/client/akashic-plugins/coe-limited-plugin";
import { AkashicContainer } from "@/lib/client/akashic-container";
import { PlayCloseDialog } from "./play-close-dialog";
import { PlayEndNotification } from "./play-end-notification";
import { PlayPlayerInfoResolver } from "./play-player-info-resolver";

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

export function PlayView({
    playId,
    playToken,
    contentId,
    gameId,
    isGameMaster,
    contentWidth,
    contentHeight,
    user,
    ref,
}: {
    playId: string;
    playToken: string;
    contentId: number;
    gameId: number;
    isGameMaster: boolean;
    contentWidth: number;
    contentHeight: number;
    user: User;
    ref: RefObject<HTMLDivElement | null>;
}) {
    const { playlogServerUrl } = useAkashic();
    const [skipping, setSkipping] = useState(false);
    const [warning, setWarning] = useState<WarningType>();
    const [error, setError] = useState<string>();
    const [playEndReason, setPlayEndReason] = useState<PlayEndReason>();
    const [requestPlayerInfo, setRequestPlayerInfo] =
        useState<ResolvingPlayerInfoRequest>();

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
            contentId,
            playId,
            playToken,
            playlogServerUrl,
            onSkip: setSkipping,
            onError: setError,
            onPlayEnd: setPlayEndReason,
            onRequestPlayerInfo: setRequestPlayerInfo,
        });
        return () => {
            // Promiseだが、遅延終了しても影響なし
            container.destroy();
        };
    }, []);
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
                <Stack direction="row" justifyContent="flex-end">
                    <Button
                        component={Link}
                        href={`/game/${gameId}#feedback`}
                        variant="outlined"
                    >
                        このゲームの投稿者にフィードバックを送る
                    </Button>
                </Stack>
            </Container>
        </>
    );
}
