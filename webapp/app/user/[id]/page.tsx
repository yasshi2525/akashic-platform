"use client";

import { JSX, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
    GitHub,
    Google,
    Logout,
    OpenInNew,
    Twitter,
} from "@mui/icons-material";
import { GameInfo, UserNameFormState, UserHandleFormState } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useCopyToClipboard } from "@/lib/client/useCopyToClipboard";
import { useUserFeedback } from "@/lib/client/useUserFeedback";
import { useUserProfile } from "@/lib/client/useUserProfile";
import { AuthProvider, authProviderNames } from "@/lib/client/auth-providers";
import {
    updateUserHandleAction,
    updateUserNameAction,
} from "@/lib/server/user";
import { CopyLinkBox, CopyStatusSnackbar } from "@/components/copy-link-box";
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
    const [name, setName] = useState(currentName);
    const [state, action] = useFormState(
        updateUserNameAction,
        initialUserNameState,
    );

    useEffect(() => {
        setName(currentName);
    }, [currentName]);

    useEffect(() => {
        if (state.submitted && state.ok && state.name) {
            onUpdated(state.name);
        }
    }, [state.submitted, state.ok, state.name, state.submittedAt, onUpdated]);

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
                {!state.ok && state.submitted && (
                    <Alert severity="error" variant="outlined">
                        {state.message}
                    </Alert>
                )}
                {state.ok && state.submitted && (
                    <Alert severity="success" variant="outlined">
                        ユーザー名を更新しました。
                    </Alert>
                )}
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

const initialUserHandleState: UserHandleFormState = {
    ok: true,
    submitted: false,
};

function UserHandleForm({
    currentHandle,
    onUpdated,
}: {
    currentHandle?: string;
    onUpdated: (handle: string) => void;
}) {
    const [handle, setHandle] = useState(currentHandle ?? "");
    const [state, action] = useFormState(
        updateUserHandleAction,
        initialUserHandleState,
    );

    useEffect(() => {
        setHandle(currentHandle ?? "");
    }, [currentHandle]);

    useEffect(() => {
        if (state.submitted && state.ok && state.handle) {
            onUpdated(state.handle);
        }
    }, [state.submitted, state.ok, state.handle, state.submittedAt, onUpdated]);

    return (
        <form action={action}>
            <Stack spacing={2}>
                <TextField
                    label="あなたの部屋ID"
                    name="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="例: user12345"
                    helperText="2〜20文字の英小文字・数字・ _ ・ - が使えます。先頭は英数字にしてください。"
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 20 } }}
                />
                {!state.ok && state.submitted && (
                    <Alert severity="error" variant="outlined">
                        {state.message}
                    </Alert>
                )}
                {state.ok && state.submitted && (
                    <Alert severity="success" variant="outlined">
                        あなたの部屋IDを更新しました。
                    </Alert>
                )}
                <UserHandleSubmitButton />
            </Stack>
        </form>
    );
}

function UserHandleSubmitButton() {
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
    const [handle, setHandle] = useState<string>();
    const [liveUrl, setLiveUrl] = useState<string>();
    const {
        copyStatus: liveCopyStatus,
        copy: copyLiveUrl,
        clearCopyStatus: clearLiveCopyStatus,
    } = useCopyToClipboard();

    const isOwner = useMemo(() => {
        return user?.authType === "oauth" && user.id === id;
    }, [user, id]);

    useEffect(() => {
        if (profile) {
            setHandle(profile.handle);
        }
    }, [profile]);

    useEffect(() => {
        if (!handle || typeof window === "undefined") {
            return;
        }
        setLiveUrl(
            new URL(`/live/${handle}`, window.location.origin).toString(),
        );
    }, [handle]);

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

    const handleProfileUpdated = useCallback(
        (name: string) => {
            mutate();
            userDispatch({
                type: "update-profile",
                update: {
                    name,
                },
            });
        },
        [mutate, userDispatch],
    );

    function handleCopyLiveUrl() {
        if (liveUrl) {
            copyLiveUrl(liveUrl);
        }
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
                                sx={{
                                    alignItems: {
                                        xs: "flex-start",
                                        sm: "center",
                                    },
                                }}
                            >
                                <Avatar
                                    src={profile.image}
                                    alt={profile.name}
                                    sx={{ width: 96, height: 96 }}
                                />
                                <Typography variant="h4" component="h1">
                                    {profile.name}
                                </Typography>
                                {isOwner && (
                                    <UserAuthProvider
                                        provider={profile.provider}
                                    />
                                )}
                            </Stack>
                            {isOwner && (
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
                                        <Typography variant="h6">
                                            あなたの部屋ID
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="textSecondary"
                                        >
                                            あなたの部屋IDを設定すると{" "}
                                            <strong>
                                                /live/[あなたの部屋ID]
                                            </strong>{" "}
                                            という固定URLで、いつでもあなたの最新の部屋に案内できます。
                                        </Typography>
                                        <UserHandleForm
                                            currentHandle={handle}
                                            onUpdated={setHandle}
                                        />
                                        {handle && (
                                            <>
                                                <Typography variant="h6">
                                                    あなたの部屋リンク
                                                </Typography>
                                                <Stack
                                                    direction={{
                                                        xs: "column",
                                                        sm: "row",
                                                    }}
                                                    spacing={1}
                                                    sx={{
                                                        alignItems: {
                                                            xs: "stretch",
                                                            sm: "center",
                                                        },
                                                    }}
                                                >
                                                    <CopyLinkBox
                                                        url={liveUrl}
                                                        onCopy={
                                                            handleCopyLiveUrl
                                                        }
                                                        mode="light"
                                                    />
                                                    <Button
                                                        component={Link}
                                                        href={`/live/${handle}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        startIcon={
                                                            <OpenInNew />
                                                        }
                                                        variant="outlined"
                                                        sx={{
                                                            borderColor:
                                                                theme.palette
                                                                    .primary
                                                                    .light,
                                                            color: theme.palette
                                                                .primary.light,
                                                        }}
                                                    >
                                                        開く
                                                    </Button>
                                                </Stack>
                                            </>
                                        )}
                                        <Divider />
                                        <Box>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Logout />}
                                                onClick={handleSignOut}
                                                sx={{
                                                    borderColor:
                                                        theme.palette.warning
                                                            .main,
                                                    color: theme.palette.warning
                                                        .main,
                                                }}
                                            >
                                                サインアウト
                                            </Button>
                                        </Box>
                                    </Stack>
                                </>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                <UserGameListSection
                    userId={id}
                    title="投稿したゲーム"
                    renderActions={(game: GameInfo, isTable: boolean) => (
                        <Stack
                            direction={isTable ? "column" : "row"}
                            spacing={1}
                        >
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
                            {isOwner && (
                                <Button
                                    variant="contained"
                                    component={Link}
                                    href={`/game/${game.id}/edit`}
                                >
                                    編集
                                </Button>
                            )}
                        </Stack>
                    )}
                />

                {isOwner && <OwnerFeedbackSection userId={profile.id} />}
            </Stack>
            <PlayCreateDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                game={selectedGame}
                user={user}
                afterCreate={{ action: "navigate" }}
            />
            <CopyStatusSnackbar
                status={liveCopyStatus}
                onClose={clearLiveCopyStatus}
                successMessage="リンクをコピーしました"
            />
        </Container>
    );
}
