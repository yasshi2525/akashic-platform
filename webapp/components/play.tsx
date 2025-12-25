"use client";

import { useEffect, useRef } from "react";
import {
    AkashicGameView,
    ExecutionMode,
    GameContent,
} from "@yasshi2525/agvw-like";

const playlogServerUrl = "http://localhost:3031";

export default function Play({
    contentId,
    playId,
    playToken,
}: {
    contentId: string;
    playId: string;
    playToken: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    let initialized = false;

    useEffect(() => {
        if (!containerRef?.current || initialized) {
            return;
        }
        const agv = new AkashicGameView({
            container: containerRef.current,
            width: 1280,
            height: 720,
            trustedChildOrigin: /.*/,
        });
        const content = new GameContent({
            player: {
                id: "admin",
                name: "admin-name",
            },
            playConfig: {
                playId,
                playToken,
                executionMode: ExecutionMode.Passive,
                playlogServerUrl,
            },
            contentUrl: `/api/content/${contentId}`,
        });
        content.addErrorListener({
            onError: (err) => {
                console.error(err, (err as any).cause);
            },
        });
        agv.addContent(content);
        initialized = true;
    }, []);

    return (
        <>
            <div>入室しました。ゲームを起動します。</div>
            <div ref={containerRef}></div>
        </>
    );
}
