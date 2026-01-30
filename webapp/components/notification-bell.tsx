"use client";

import { MouseEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistance } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Alert,
    Avatar,
    Badge,
    Box,
    Button,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { Notifications } from "@mui/icons-material";
import {
    markAllNotificationsReadAction,
    markNotificationReadAction,
} from "@/lib/server/notifications";
import { useAuth } from "@/lib/client/useAuth";
import { useNotifications } from "@/lib/client/useNotifications";

export function NotificationBell() {
    const theme = useTheme();
    const [user] = useAuth();
    const enabled = user?.authType === "oauth";
    const { isLoading, list, error, mutate } = useNotifications(!!enabled);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const unreadCount = useMemo(() => {
        if (!list) return 0;
        return list.filter((item) => item.unread).length;
    }, [list]);

    if (!enabled) {
        return null;
    }

    function handleOpen(ev: MouseEvent<HTMLElement>) {
        setAnchorEl(ev.currentTarget);
    }

    function handleClose() {
        setAnchorEl(null);
    }

    function handleMarkAll() {
        startTransition(async () => {
            await markAllNotificationsReadAction();
            await mutate();
        });
    }

    function handleItemClick(id: number, link?: string) {
        startTransition(async () => {
            await markNotificationReadAction(id);
            await mutate();
            if (link) {
                router.push(link);
            }
        });
        handleClose();
    }

    return (
        <>
            <IconButton aria-label="notifications" onClick={handleOpen}>
                <Badge
                    badgeContent={unreadCount > 99 ? "99+" : unreadCount}
                    color="error"
                >
                    <Notifications fontSize="large" />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        sx: { width: 360, maxHeight: 520 },
                    },
                }}
            >
                <Box sx={{ px: 2, pt: 1, pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1">通知</Typography>
                        <Button
                            size="small"
                            onClick={handleMarkAll}
                            disabled={isPending || !unreadCount}
                        >
                            すべて既読
                        </Button>
                    </Stack>
                </Box>
                <Divider />
                {isLoading ? (
                    <Box sx={{ px: 2, py: 2 }}>
                        <Typography variant="body2">読み込み中...</Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{ px: 2, py: 2 }}>
                        <Alert severity="error" variant="outlined">
                            {error}
                        </Alert>
                    </Box>
                ) : list && list.length ? (
                    list.map((notice) => (
                        <MenuItem
                            key={notice.id}
                            onClick={() =>
                                handleItemClick(
                                    notice.id,
                                    notice.link ?? undefined,
                                )
                            }
                            sx={{
                                alignItems: "flex-start",
                                gap: 2,
                                opacity: notice.unread ? 1 : 0.6,
                            }}
                        >
                            <Avatar
                                src={notice.iconURL}
                                sx={{ width: 36, height: 36 }}
                            />
                            <Stack spacing={0.5}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: notice.unread ? 600 : 400,
                                    }}
                                >
                                    {notice.body}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color={theme.palette.text.secondary}
                                >
                                    {formatDistance(
                                        new Date(notice.createdAt),
                                        new Date(),
                                        { addSuffix: true, locale: ja },
                                    )}
                                </Typography>
                                {notice.link ? (
                                    <Typography
                                        variant="caption"
                                        color="primary"
                                        component={Link}
                                        href={notice.link}
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        詳細を見る
                                    </Typography>
                                ) : null}
                            </Stack>
                        </MenuItem>
                    ))
                ) : (
                    <Box sx={{ px: 2, py: 2 }}>
                        <Typography variant="body2">
                            通知はありません。
                        </Typography>
                    </Box>
                )}
            </Menu>
        </>
    );
}
