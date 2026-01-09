"use client";

import { MouseEvent, RefObject, TouchEvent, useEffect, useState } from "react";
import { Alert, Container, Snackbar } from "@mui/material";
import {
    AkashicGameView,
    ExecutionMode,
    GameContent,
} from "@yasshi2525/agvw-like";
import { User } from "@/lib/types";
import { useAkashic } from "@/lib/client/useAkashic";
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
        const view = new AkashicGameView({
            container: ref.current,
            width: ref.current.clientWidth,
            height: ref.current.clientHeight,
            // NOTE: untrusted のときこの値が使用される。 akashic-cli-serve の値としている。
            trustedChildOrigin: /.*/,
        });
        const content = new GameContent({
            player: {
                id: user.id,
                name: user.name,
            },
            playConfig: {
                playId,
                playToken,
                executionMode: ExecutionMode.Passive,
                playlogServerUrl,
            },
            contentUrl: `/api/content/${contentId}`,
        });
        const observer = new ResizeObserver((entries) => {
            for (const e of entries.filter((e) => e.target === ref.current)) {
                content.setContentArea({
                    x: 0,
                    y: 0,
                    width: e.contentRect.width,
                    height: e.contentRect.height,
                });
            }
        });
        observer.observe(ref.current);
        content.addSkippingListener({
            onSkip: (isSkipping) => {
                setSkipping(isSkipping);
            },
        });
        content.addErrorListener({
            onError: (err) => {
                setError(
                    "予期しないエラーが発生しました。画面を更新してください。",
                );
                console.error(err);
                content.pause();
            },
        });
        view.addContent(content);
        return () => {
            observer.disconnect();
            // NOTE: agvw 実装は作成した div 要素を削除しないので手動で削除している
            view._gameContentShared.gameViewElement.destroy();
            view.destroy();
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
