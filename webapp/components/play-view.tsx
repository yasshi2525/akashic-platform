"use client";

import { MouseEvent, RefObject, TouchEvent, useEffect, useState } from "react";
import { Alert, Container, Snackbar } from "@mui/material";
import { User } from "@/lib/types";
import { useAkashic } from "@/lib/client/useAkashic";
import { AkashicContainer } from "@/lib/client/akashic-container";
import { PlayCloseDialog } from "./play-close-dialog";

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

export function PlayView({
    playId,
    playToken,
    contentId,
    isGameMaster,
    contentWidth,
    contentHeight,
    user,
    ref,
}: {
    playId: string;
    playToken: string;
    contentId: number;
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
        const container = new AkashicContainer({
            parent: ref.current,
            user,
            contentId,
            playId,
            playToken,
            playlogServerUrl,
            onSkip: setSkipping,
            onError: setError,
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
            {isGameMaster ? <PlayCloseDialog playId={playId} /> : null}
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
        </>
    );
}
