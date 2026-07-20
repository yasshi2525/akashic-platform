"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
    alpha,
    Alert,
    Box,
    CircularProgress,
    Container,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    useTheme,
} from "@mui/material";
import { Send } from "@mui/icons-material";
import { PLAY_CHAT_BODY_MAX, PLAY_CHAT_NAME_MAX } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { usePlayChatContext } from "@/lib/client/usePlayChatContext";
import {
    PlayChatFormState,
    postPlayChatAction,
} from "@/lib/server/play-chat-post";
import { UserInline } from "../user-inline";

const initialFormState: PlayChatFormState = {
    ok: true,
    submitted: false,
};

function SendButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Tooltip
            arrow
            title="コメントを送信"
            slotProps={{ popper: { disablePortal: true } }}
        >
            <span>
                <IconButton
                    type="submit"
                    color="primary"
                    aria-label="コメントを送信"
                    disabled={disabled || pending}
                >
                    {pending ? <CircularProgress size={20} /> : <Send />}
                </IconButton>
            </span>
        </Tooltip>
    );
}

export function PlayChatInput() {
    const theme = useTheme();
    const [user] = useAuth();
    const { playId, fullscreen, refresh, playerName, setPlayerName } =
        usePlayChatContext();
    const [body, setBody] = useState("");
    const [state, formAction] = useFormState(
        postPlayChatAction,
        initialFormState,
    );

    const isOAuth = user?.authType === "oauth";

    useEffect(() => {
        if (state.submitted && state.ok && state.submittedAt) {
            setBody("");
            void refresh();
        }
    }, [state.submitted, state.ok, state.submittedAt, refresh]);

    return (
        <Container
            component="div"
            disableGutters
            sx={{ maxWidth: fullscreen ? "none" : undefined, flexShrink: 0 }}
        >
            <Stack
                spacing={0.5}
                sx={{
                    backgroundColor: fullscreen
                        ? alpha("#000", 0.55)
                        : theme.palette.background.paper,
                    px: { xs: 1, sm: 1.5 },
                    py: 1,
                    borderBottomLeftRadius: fullscreen
                        ? 0
                        : theme.shape.borderRadius,
                    borderBottomRightRadius: fullscreen
                        ? 0
                        : theme.shape.borderRadius,
                }}
            >
                {!state.ok && state.submitted && (
                    <Alert severity="warning" variant="outlined">
                        {state.message}
                    </Alert>
                )}
                <Stack
                    component="form"
                    action={formAction}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                >
                    <input type="hidden" name="playId" value={playId} />
                    {isOAuth ? (
                        <Box
                            sx={{
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                                maxWidth: { xs: 96, sm: 160 },
                                overflow: "hidden",
                            }}
                        >
                            <UserInline
                                user={{ name: user.name, image: user.image }}
                                avatarSize={24}
                            />
                        </Box>
                    ) : (
                        <TextField
                            size="small"
                            name="authorName"
                            placeholder="名前"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            slotProps={{
                                htmlInput: { maxLength: PLAY_CHAT_NAME_MAX },
                            }}
                            sx={{ width: { xs: 96, sm: 140 }, flexShrink: 0 }}
                        />
                    )}
                    <TextField
                        size="small"
                        fullWidth
                        name="body"
                        placeholder="コメントを入力"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        slotProps={{
                            htmlInput: { maxLength: PLAY_CHAT_BODY_MAX },
                        }}
                    />
                    <SendButton disabled={!body.trim()} />
                </Stack>
            </Stack>
        </Container>
    );
}
