"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import {
    AkashicGameView,
    ExecutionMode,
    GameContent,
} from "@yasshi2525/agvw-like";

const playlogServerUrl = "http://localhost:3031";
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res.json();
};

export default function Play({
    contentId,
    playId,
}: {
    contentId: string;
    playId: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { data, isLoading, error } = useSWR<{ playToken: string }, string>(
        `${playlogServerUrl}/join?playId=${playId}`,
        fetcher,
    );

    useEffect(() => {
        if (!containerRef.current || !data) {
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
                playToken: data.playToken,
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
        return () => {
            agv.destroy();
            console.log("akashic game view was destroyed.");
        };
    }, [data]);

    if (isLoading) {
        return (
            <>
                <div>入室中です...</div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <div>入室に失敗しました: {error}</div>
            </>
        );
    }

    return (
        <>
            <div>入室しました。ゲームを起動します。</div>
            <div ref={containerRef}></div>
        </>
    );
}
