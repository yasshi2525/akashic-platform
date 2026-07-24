"use client";

import { useState, useTransition } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import { formatDistance } from "date-fns";
import { ja } from "date-fns/locale";
import { MUTE_LIMIT_DEFAULT } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { useMutes } from "@/lib/client/useMutes";
import { useLocalMutes } from "@/lib/client/useLocalMutes";
import { clearMuteOverrides } from "@/lib/client/mute-store";
import { unmuteAction } from "@/lib/server/mute-action";

const initialState = { ok: true, submitted: false } as const;

function relative(date: Date) {
    return formatDistance(date, new Date(), {
        addSuffix: true,
        locale: ja,
    });
}

function EmptyNote() {
    return (
        <Typography variant="body2" color="textSecondary" sx={{ py: 1 }}>
            ミュートしている相手はいません。
        </Typography>
    );
}

function PersistedMutes() {
    const { isLoading, list, error, mutate } = useMutes(true);
    const [pending, startTransition] = useTransition();
    const [actionError, setActionError] = useState<string | undefined>();

    const unmute = (muteId: number) => {
        setActionError(undefined);
        const formData = new FormData();
        formData.set("muteId", `${muteId}`);
        startTransition(async () => {
            const state = await unmuteAction(initialState, formData);
            if (!state.ok) {
                setActionError(state.message);
                return;
            }
            // 表示中の投稿に残っている上書きを捨て、サーバーの判定に戻す
            clearMuteOverrides();
            await mutate();
        });
    };

    if (isLoading) {
        return (
            <Stack sx={{ alignItems: "center", py: 2 }}>
                <CircularProgress size={24} />
            </Stack>
        );
    }
    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }
    const mutes = list ?? [];
    return (
        <Stack spacing={1}>
            <Typography variant="body2" color="textSecondary">
                サインインしているため、ミュートはアカウントに保存され、他の端末にも反映されます（
                {mutes.length} / {MUTE_LIMIT_DEFAULT} 件）。
            </Typography>
            {actionError && <Alert severity="warning">{actionError}</Alert>}
            {mutes.length === 0 ? (
                <EmptyNote />
            ) : (
                <List disablePadding>
                    {mutes.map((mute) => (
                        <ListItem
                            key={mute.id}
                            divider
                            secondaryAction={
                                <Button
                                    size="small"
                                    onClick={() => unmute(mute.id)}
                                    disabled={pending}
                                >
                                    解除
                                </Button>
                            }
                        >
                            <ListItemText
                                primary={mute.label}
                                secondary={`${relative(new Date(mute.createdAt))} にミュート`}
                                slotProps={{
                                    primary: {
                                        variant: "body2",
                                        sx: {
                                            overflowWrap: "anywhere",
                                        },
                                    },
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Stack>
    );
}

function LocalMutes() {
    const { entries, remove } = useLocalMutes();

    return (
        <Stack spacing={1}>
            <Alert severity="info" variant="outlined">
                サインインしていないため、ミュートはこの端末にのみ保存されます。サインインすると他の端末にも引き継げます。
            </Alert>
            <Typography variant="body2" color="textSecondary">
                {entries.length} / {MUTE_LIMIT_DEFAULT} 件
            </Typography>
            {entries.length === 0 ? (
                <EmptyNote />
            ) : (
                <List disablePadding>
                    {entries.map((entry) => (
                        <ListItem
                            key={entry.anonKey}
                            divider
                            secondaryAction={
                                <Button
                                    size="small"
                                    onClick={() => remove(entry.anonKey)}
                                >
                                    解除
                                </Button>
                            }
                        >
                            <ListItemText
                                primary={entry.label}
                                secondary={`${relative(new Date(entry.createdAt))} にミュート`}
                                slotProps={{
                                    primary: {
                                        variant: "body2",
                                        sx: {
                                            overflowWrap: "anywhere",
                                        },
                                    },
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Stack>
    );
}

export function MuteSettings() {
    const [user] = useAuth();

    return (
        <Box sx={{ maxWidth: "sm", mx: "auto", py: 2, px: { xs: 1.5, sm: 0 } }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h6">ミュート</Typography>
                    <Typography variant="body2" color="textSecondary">
                        ミュートした相手の投稿は折りたたまれ、その人が立てた部屋は一覧に表示されなくなります。相手には通知されません。
                    </Typography>
                </Box>
                <Divider />
                {user?.authType === "oauth" ? (
                    <PersistedMutes />
                ) : (
                    <LocalMutes />
                )}
            </Stack>
        </Box>
    );
}
