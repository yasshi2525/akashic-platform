"use client";

import { useState } from "react";

const playlogServerUrl = "http://localhost:3031";

export default function NewPlay({
    contentId,
    handleNewPlay,
}: {
    contentId: string;
    handleNewPlay: (playInfo: {
        contentId: string;
        playId: string;
        playToken: string;
    }) => void;
}) {
    const [disabledCreationButton, setDisabledCreationButton] = useState(false);
    const [disabledJoinButton, setDisabledJoinButton] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const [playId, setPlayId] = useState<string | null>(null);

    const handleCreation = () => {
        if (!disabledCreationButton) {
            setDisabledCreationButton(true);
            fetch(`/api/play/${contentId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    playerId: "admin",
                    playerName: "admin-player",
                }),
            })
                .then((res) => {
                    if (res.status === 200) {
                        res.json().then(({ playId }) => {
                            setPlayId(playId);
                        });
                    } else {
                        res.text().then((msg) => setErrMsg(msg));
                    }
                })
                .catch((err) => {
                    setErrMsg(`Error: ${(err as Error).message}`);
                });
        }
    };

    const handleJoining = () => {
        setDisabledJoinButton(true);
        if (!playId) {
            setErrMsg("入室に失敗しました。");
        } else {
            fetch(`${playlogServerUrl}/join?playId=${playId}`)
                .then((res) => {
                    if (res.status === 200) {
                        res.json().then(({ playToken }) => {
                            handleNewPlay({ contentId, playId, playToken });
                        });
                    } else {
                        res.text().then((msg) => setErrMsg(msg));
                    }
                })
                .catch((err) => {
                    setErrMsg(`Error: ${(err as Error).message}`);
                });
        }
    };

    if (playId) {
        return (
            <>
                <div>新しい部屋が作成されました</div>
                <button disabled={disabledJoinButton} onClick={handleJoining}>
                    {!disabledJoinButton ? "部屋に入る" : "お待ち下さい"}
                </button>
                {errMsg ? <div>エラー: {errMsg}</div> : undefined}
            </>
        );
    }

    return (
        <>
            <div>新しい部屋を作成する</div>
            <button disabled={disabledCreationButton} onClick={handleCreation}>
                {!disabledCreationButton ? "作成する" : "お待ち下さい"}
            </button>
            {errMsg ? <div>エラー: {errMsg}</div> : undefined}
        </>
    );
}
