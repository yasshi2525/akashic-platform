"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useFormState, useFormStatus } from "react-dom";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
    Skeleton,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { GitHub, Google, Logout, Twitter } from "@mui/icons-material";
import { GameInfo } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useUserFeedback } from "@/lib/client/useUserFeedback";
import { useUserProfile } from "@/lib/client/useUserProfile";
import { AuthProvider, authProviderNames } from "@/lib/client/auth-providers";
import { updateUserNameAction } from "@/lib/server/user";
import { PlayCreateDialog } from "@/components/play-create-dialog";
import { UserFeedbackList } from "@/components/user-feedback-list";
import { UserGameListSection } from "@/components/user-game-list-section";

const providerIcons: Record<AuthProvider, JSX.Element> = {
    github: <GitHub />,
    google: <Google />,
    twitter: <Twitter />,
};

function UserAuthProvider({ provider }: { provider?: string }) {
    const icon = useMemo(() => {
        return providerIcons[provider as AuthProvider];
    }, [provider]);
    const label = useMemo(() => {
        return authProviderNames[provider as AuthProvider] ?? "Unknown";
    }, [provider]);

    if (icon == null) {
        return null;
    }
    return (
        <Chip icon={icon} label={`${label}でサインイン中`} variant="outlined" />
    );
}

type UserNameFormState = {
    ok: boolean;
    submitted: boolean;
    message?: string;
    submittedAt?: number;
};

const initialUserNameState: UserNameFormState = {
    ok: true,
    submitted: false,
};

function UserNameForm({
    userId,
    currentName,
    onUpdated,
}: {
    userId: string;
    currentName: string;
    onUpdated: (name: string) => void;
}) {
    const router = useRouter();
    const [name, setName] = useState(currentName);
    const [state, action] = useFormState(
        updateUserNameAction,
        initialUserNameState,
    );

    useEffect(() => {
        setName(currentName);
    }, [currentName]);

    useEffect(() => {
        if (state.submitted && state.ok && state.submittedAt) {
            onUpdated(name);
            router.refresh();
        }
    }, [state.submitted, state.ok, state.submittedAt, router, onUpdated, name]);

    return (
        <form action={action}>
            <Stack spacing={2}>
                <input type="hidden" name="userId" value={userId} />
                <TextField
                    label="ユーザー名"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    fullWidth
                />
                {!state.ok && state.submitted ? (
                    <Alert severity="error" variant="outlined">
                        {state.message}
                    </Alert>
                ) : null}
                {state.ok && state.submitted ? (
                    <Alert severity="success" variant="outlined">
                        ユーザー名を更新しました。
                    </Alert>
                ) : null}
                <UserNameSubmitButton />
            </Stack>
        </form>
    );
}

function UserNameSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="contained" disabled={pending}>
            変更
        </Button>
    );
}

function OwnerFeedbackSection({ userId }: { userId: string }) {
    const received = useUserFeedback(userId, "received");
    const posted = useUserFeedback(userId, "posted");

    function handleReceivedMore() {
        received.setPage(received.page + 1);
    }

    function handlePostedMore() {
        posted.setPage(posted.page + 1);
    }

    return (
        <Stack spacing={4}>
            <UserFeedbackList
                title="未返信のフィードバック"
                list={received.list?.flat()}
                isLoading={received.isLoading}
                isEmpty={received.isEmpty}
                isEnd={received.isEnd}
                error={received.error}
                onLoadMore={handleReceivedMore}
                showReplyForm
                onRefresh={received.mutate}
                emptyMessage="未返信のフィードバックはありません。"
            />
            <UserFeedbackList
                title="自分が送ったフィードバック"
                list={posted.list?.flat()}
                isLoading={posted.isLoading}
                isEmpty={posted.isEmpty}
                isEnd={posted.isEnd}
                error={posted.error}
                onLoadMore={handlePostedMore}
                emptyMessage="送ったフィードバックはまだありません。"
            />
        </Stack>
    );
}

export default function UserPage() {
    const theme = useTheme();
    const { id } = useParams<{ id: string }>();
    const [user, userDispatch] = useAuth();
    const { isLoading, profile, error, mutate } = useUserProfile(id);
    const [selectedGame, setSelectedGame] = useState<GameInfo>();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [signouting, setIsSignouting] = useState(false);

    const isOwner = useMemo(() => {
        return user?.authType === "oauth" && user.id === id;
    }, [user, id]);

    function handleSignOut() {
        if (signouting) {
            return;
        }
        setIsSignouting(true);
        signOut();
    }

    function handleOpenDialog(game: GameInfo) {
        setSelectedGame(game);
        setDialogOpen(true);
    }

    function handleCloseDialog() {
        setDialogOpen(false);
    }

    function handleProfileUpdated(name: string) {
        mutate();
        userDispatch({
            type: "update-profile",
            update: {
                name,
            },
        });
    }

    if (isLoading) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Skeleton variant="rectangular" height={240} />
            </Container>
        );
    }

    if (error || !profile) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error" variant="outlined">
                    {error ?? "ユーザー情報の取得に失敗しました。"}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack spacing={4}>
                <Card>
                    <CardContent>
                        <Stack spacing={3}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                            >
                                <Avatar
                                    src={profile.image}
                                    alt={profile.name}
                                    sx={{ width: 96, height: 96 }}
                                />
                                <Typography variant="h4" component="h1">
                                    {profile.name}
                                </Typography>
                                {isOwner ? (
                                    <UserAuthProvider
                                        provider={profile.provider}
                                    />
                                ) : null}
                            </Stack>
                            {isOwner ? (
                                <>
                                    <Divider />
                                    <Stack spacing={2}>
                                        <Typography variant="h6">
                                            プロフィール編集
                                        </Typography>
                                        <UserNameForm
                                            userId={profile.id}
                                            currentName={profile.name}
                                            onUpdated={handleProfileUpdated}
                                        />
                                        <Box>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Logout />}
                                                onClick={handleSignOut}
                                                sx={{
                                                    borderColor:
                                                        theme.palette.primary
                                                            .light,
                                                    color: theme.palette.primary
                                                        .light,
                                                }}
                                            >
                                                サインアウト
                                            </Button>
                                        </Box>
                                    </Stack>
                                </>
                            ) : null}
                        </Stack>
                    </CardContent>
                </Card>

                <UserGameListSection
                    userId={id}
                    title="投稿したゲーム"
                    renderActions={(game: GameInfo) => (
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                component={Link}
                                href={`/game/${game.id}`}
                                sx={{
                                    borderColor: theme.palette.primary.light,
                                    color: theme.palette.primary.light,
                                }}
                            >
                                詳細
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => handleOpenDialog(game)}
                                sx={{
                                    borderColor: theme.palette.primary.light,
                                    color: theme.palette.primary.light,
                                }}
                            >
                                部屋を作る
                            </Button>
                            {isOwner ? (
                                <Button
                                    variant="contained"
                                    component={Link}
                                    href={`/game/${game.id}/edit`}
                                >
                                    編集
                                </Button>
                            ) : null}
                        </Stack>
                    )}
                />

                {isOwner ? <OwnerFeedbackSection userId={profile.id} /> : null}
            </Stack>
            <PlayCreateDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                game={selectedGame}
                user={user}
            />
        </Container>
    );
}
