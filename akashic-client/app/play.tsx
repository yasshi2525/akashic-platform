"use client";

import {
    AkashicGameView,
    ExecutionMode,
    GameContent,
} from "@yasshi2525/agvw-like";
import { useEffect, useRef } from "react";

export default function Play({ contentId }: { contentId: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        const agv = new AkashicGameView({
            container: containerRef.current,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            trustedChildOrigin: /.*/,
        });
        const content = new GameContent({
            player: {
                id: "admin",
                name: "admin-name",
            },
            playConfig: {
                playId: "play1",
                playToken: "play1Token",
                executionMode: ExecutionMode.Passive,
                playlogServerUrl: window.location.href,
            },
            contentUrl: `/api/content/${contentId}`,
        });
        agv.addContent(content);
        return () => {
            agv.destroy();
        };
    }, []);

    return <div ref={containerRef}></div>;
}
