"use client";

import { Box } from "@mui/material";
import { useAuth } from "@/lib/client/useAuth";
import { PlayList } from "@/components/play-list";
import { GuestLanding } from "@/components/landing";
import { MessageBoard } from "@/components/message-board";

export default function Home() {
    const [user] = useAuth();

    return (
        // コンテンツが短くてもフッター直前まで押し下げるため flex
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
            }}
        >
            {user == null || user.authType === "guest" ? (
                <GuestLanding />
            ) : (
                <PlayList />
            )}
            <MessageBoard />
        </Box>
    );
}
