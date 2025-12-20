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

export default function Play({ contentId }: { contentId: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        data: play,
        isLoading: isStarting,
        error: startError,
    } = useSWR<{ playId: string; playToken: string }, string>(
        `${playlogServerUrl}/start`,
        fetcher,
    );
    const { data, isLoading, error } = useSWR<{ playToken: string }, string>(
        play ? `${playlogServerUrl}/join?playId=${play.playId}` : null,
        fetcher,
    );

    useEffect(() => {
        if (!containerRef.current || !play || !data) {
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
                playId: play.playId,
                playToken: data.playToken,
                executionMode: ExecutionMode.Passive,
                playlogServerUrl,
            },
            contentUrl: `/api/content/${contentId}`,
        });
        content.addErrorListener({
            onError: (err) => {
                console.error(err);
            },
        });
        agv.addContent(content);
        return () => {
            agv.destroy();
            console.log("akashic game view was destroyed.");
        };
    }, [play, data]);

    if (isStarting) {
        return <div>Play 作成中...</div>;
    }

    if (startError) {
        return <div>Play 作成失敗: ${startError}</div>;
    }

    if (isLoading) {
        return (
            <>
                <div>Play 作成完了: playId = {play?.playId}</div>
                <div>Play 参加中...</div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <div>Play 作成完了: playId = {play?.playId}</div>
                <div>Play 参加失敗: ${error}</div>
            </>
        );
    }

    return (
        <>
            <div>Play 作成完了: playId = {play?.playId}</div>
            <div>Play 参加完了: playToken = {data?.playToken}</div>
            <div ref={containerRef}></div>
        </>
    );
}
