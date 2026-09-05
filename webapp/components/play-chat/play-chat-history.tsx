"use client";

import { useEffect, useRef } from "react";
import {
    alpha,
    Alert,
    Box,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import { formatDistance } from "date-fns";
import { ja } from "date-fns/locale";
import { PlayChatMessageInfo } from "@/lib/types";
import { usePlayChatContext } from "@/lib/client/usePlayChatContext";
import { useMute } from "@/lib/client/useMute";
import { UserInline } from "../user-inline";
import { MutedMessage } from "../muted-message";
import { ModerationMenu, BanContext } from "../moderation-menu";

function HistoryBody({ message }: { message: PlayChatMessageInfo }) {
    return (
        <Stack spacing={0.25}>
            <Stack
                direction="row"
                sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    // spacing は margin-left で実装されるため、
                    // 折り返した 2 行目の先頭がインデントされてしまう
                    columnGap: 1,
                    rowGap: 0.25,
                }}
            >
                <UserInline
                    user={{
                        id: message.author.id,
                        name: message.author.name,
                        image: message.author.iconURL,
                    }}
                    avatarSize={20}
                    textVariant="subtitle2"
                />
                <Typography variant="caption" color="textSecondary">
                    {formatDistance(new Date(message.createdAt), new Date(), {
                        addSuffix: true,
                        locale: ja,
                    })}
                </Typography>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {message.body}
            </Typography>
        </Stack>
    );
}

function HistoryItem({
    message,
    mute,
    banContext,
}: {
    message: PlayChatMessageInfo;
    mute: ReturnType<typeof useMute>;
    banContext?: BanContext;
}) {
    if (mute.isMuted(message)) {
        return (
            <MutedMessage
                menu={
                    <ModerationMenu
                        message={message}
                        mute={mute}
                        source="chat"
                        banContext={banContext}
                    />
                }
            >
                <HistoryBody message={message} />
            </MutedMessage>
        );
    }
    return (
        <Stack
            direction="row"
            sx={{ alignItems: "flex-start", columnGap: 0.5 }}
        >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <HistoryBody message={message} />
            </Box>
            <ModerationMenu
                message={message}
                mute={mute}
                source="chat"
                banContext={banContext}
            />
        </Stack>
    );
}

export function PlayChatHistory({
    messages,
}: {
    messages: PlayChatMessageInfo[];
}) {
    const { isLoading, error, refresh, isGameMaster, playId } =
        usePlayChatContext();
    const mute = useMute("chat", refresh);
    // 部屋主のときだけ、発言者をBANする導線を出す
    const banContext: BanContext | undefined = isGameMaster
        ? { playId: parseInt(playId), onDone: refresh }
        : undefined;
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length]);

    return (
        <Box
            ref={listRef}
            sx={{
                overflowY: "auto",
                maxHeight: { xs: "30vh", sm: "35vh" },
                px: { xs: 1.5, sm: 2 },
                py: 1,
                backgroundColor: (theme) =>
                    alpha(theme.palette.background.paper, 0.96),
            }}
        >
            {isLoading ? (
                <Stack sx={{ alignItems: "center", py: 2 }}>
                    <CircularProgress size={24} />
                </Stack>
            ) : error ? (
                <Alert variant="outlined" severity="error">
                    {error}
                </Alert>
            ) : messages.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                    まだコメントはありません。
                </Typography>
            ) : (
                <Stack spacing={1.5}>
                    {messages.map((message) => (
                        <HistoryItem
                            key={message.id}
                            message={message}
                            mute={mute}
                            banContext={banContext}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
