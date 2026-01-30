"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { formatDistance } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Alert,
    Avatar,
    Button,
    Card,
    CardContent,
    Divider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { FeedbackPost, GUEST_NAME, User } from "@/lib/types";
import {
    FeedbackFormState,
    postFeedbackAction,
} from "@/lib/server/feedback";
import { FeedbackReplyForm } from "./feedback-reply-form";

const initialState: FeedbackFormState = {
    ok: true,
    submitted: false,
};

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus();
    return (
        <Button variant="contained" type="submit" disabled={pending}>
            {label}
        </Button>
    );
}

function PostForm({
    gameId,
    user,
    onRefresh,
}: {
    gameId: number;
    user: User | null;
    onRefresh?: () => void;
}) {
    const router = useRouter();
    const [state, action] = useFormState(postFeedbackAction, initialState);
    const [authorName, setAuthorName] = useState(GUEST_NAME);
    const [body, setBody] = useState("");

    useEffect(() => {
        if (state.submitted && state.ok && state.submittedAt) {
            setBody("");
            onRefresh?.();
            router.refresh();
        }
    }, [state.submitted, state.ok, state.submittedAt, router, onRefresh]);

    return (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <form action={action}>
                    <Stack spacing={2}>
                        <Typography variant="h6">フィードバックする</Typography>
                        <input type="hidden" name="gameId" value={gameId} />
                        {user?.authType !== "oauth" ? (
                            <TextField
                                label="名前"
                                name="authorName"
                                value={authorName}
                                onChange={(event) =>
                                    setAuthorName(event.target.value)
                                }
                                fullWidth
                            />
                        ) : null}
                        <TextField
                            label="フィードバック"
                            name="body"
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                        {!state.ok && state.submitted ? (
                            <Alert severity="error" variant="outlined">
                                {state.message}
                            </Alert>
                        ) : null}
                        <SubmitButton label="送信する" />
                    </Stack>
                </form>
            </CardContent>
        </Card>
    );
}

export function FeedbackPanel({
    gameId,
    user,
    isPublisher,
    feedbackList,
    onRefresh,
}: {
    gameId: number;
    user: User | null;
    isPublisher: boolean;
    feedbackList: FeedbackPost[];
    onRefresh?: () => void;
}) {
    return (
        <>
            {!isPublisher ? (
                <PostForm gameId={gameId} user={user} onRefresh={onRefresh} />
            ) : null}
            {feedbackList.length ? (
                <Stack spacing={2}>
                    {feedbackList.map((post) => (
                        <Card key={post.id} id={`post-${post.id}`}>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Stack direction="row" spacing={2}>
                                        <Avatar
                                            src={post.author.iconURL}
                                            sx={{ width: 40, height: 40 }}
                                        />
                                        <Stack spacing={0.5}>
                                            <Typography variant="subtitle1">
                                                {post.author.name}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {formatDistance(
                                                    new Date(post.createdAt),
                                                    new Date(),
                                                    {
                                                        addSuffix: true,
                                                        locale: ja,
                                                    },
                                                )}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                    <Typography
                                        variant="body1"
                                        sx={{ whiteSpace: "pre-wrap" }}
                                    >
                                        {post.body}
                                    </Typography>

                                    {post.reply ? (
                                        <>
                                            <Divider />
                                            <Stack
                                                spacing={1}
                                                sx={{
                                                    alignItems: "flex-end",
                                                    textAlign: "right",
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    spacing={2}
                                                >
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="subtitle2">
                                                            {
                                                                post.reply
                                                                    .author.name
                                                            }
                                                            （投稿者）
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {formatDistance(
                                                                new Date(
                                                                    post.reply
                                                                        .createdAt,
                                                                ),
                                                                new Date(),
                                                                {
                                                                    addSuffix: true,
                                                                    locale: ja,
                                                                },
                                                            )}
                                                        </Typography>
                                                    </Stack>
                                                    <Avatar
                                                        src={
                                                            post.reply.author
                                                                .iconURL
                                                        }
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                        }}
                                                    />
                                                </Stack>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        whiteSpace: "pre-wrap",
                                                    }}
                                                >
                                                    {post.reply.body}
                                                </Typography>
                                            </Stack>
                                        </>
                                    ) : isPublisher ? (
                                        <>
                                            <Divider />
                                            <FeedbackReplyForm
                                                postId={post.id}
                                                onRefresh={onRefresh}
                                            />
                                        </>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : (
                <Alert severity="info" variant="outlined">
                    まだフィードバックがありません。
                </Alert>
            )}
        </>
    );
}
