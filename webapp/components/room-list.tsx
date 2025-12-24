"use client";

import { useTheme } from "@emotion/react";
import { useState } from "react";

const mockRoomList = [
    {
        contentId: "1",
        playId: "play1",
        contentName: "ゲーム名1",
        hostPlayer: "ユーザー1",
        currentPlayers: 2,
        createdAt: "5分前",
    },
];

export function RoomList() {
    const theme = useTheme();
    const [rooms] = useState(mockRoomList);

    return <></>;
}
