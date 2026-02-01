"use client";

import { MouseEvent, useState } from "react";
import { signOut } from "next-auth/react";
import {
    Button,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import {
    AddCircle,
    AccountCircle,
    FormatListBulleted,
    ListAlt,
    Logout,
    Settings,
} from "@mui/icons-material";
import { User } from "@/lib/types";
import { useAuth } from "@/lib/client/useAuth";
import { UserLabel } from "./user-label";
import { SignInDialog } from "./sign-in-dialog";
import { NotificationBell } from "./notification-bell";

interface MenuProps {
    anchorEl?: HTMLElement;
    handleClose: () => void;
}

function AnonymousMenu({ anchorEl, handleClose }: MenuProps) {
    return (
        <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
            <MenuItem>
                <SignInDialog />
            </MenuItem>
        </Menu>
    );
}

interface AuthorizedMenuProps extends MenuProps {
    user: User;
}

function AuthorizedMenu({ user, anchorEl, handleClose }: AuthorizedMenuProps) {
    const theme = useTheme();
    const [signouting, setIsSignouting] = useState(false);

    function handleSignOut() {
        if (signouting) {
            return;
        }
        setIsSignouting(true);
        signOut();
    }

    return (
        <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={handleClose}
            onClick={handleClose}
        >
            <MenuItem>
                <Button
                    href={`/user/${user.id}`}
                    style={{
                        color: "inherit",
                    }}
                >
                    <AccountCircle />
                    <Typography variant="body1" sx={{ ml: 1 }}>
                        マイページ
                    </Typography>
                </Button>
            </MenuItem>
            <MenuItem>
                <Button
                    href="/my-play"
                    style={{
                        color: "inherit",
                    }}
                >
                    <FormatListBulleted />
                    <Typography variant="body1" sx={{ ml: 1 }}>
                        自分が作った部屋
                    </Typography>
                </Button>
            </MenuItem>
            <MenuItem>
                <Button
                    href="/new-game"
                    style={{
                        color: "inherit",
                    }}
                >
                    <AddCircle />
                    <Typography variant="body1" sx={{ ml: 1 }}>
                        ゲームを投稿
                    </Typography>
                </Button>
            </MenuItem>
            <MenuItem divider={true} sx={{ pb: 1 }}>
                <Button
                    href="/edit-game"
                    style={{
                        color: "inherit",
                    }}
                >
                    <ListAlt />
                    <Typography variant="body1" sx={{ ml: 1 }}>
                        投稿ゲーム一覧
                    </Typography>
                </Button>
            </MenuItem>
            <MenuItem>
                <Button
                    onClick={handleSignOut}
                    style={{
                        color: theme.palette.text.secondary,
                    }}
                >
                    <Logout />
                    <Typography variant="body1" sx={{ ml: 1 }}>
                        サインアウト
                    </Typography>
                </Button>
            </MenuItem>
        </Menu>
    );
}

export function UserMenu() {
    const [user] = useAuth();
    const [anchorEl, setAnchorEl] = useState<HTMLElement>();

    function handleClick(ev: MouseEvent<HTMLElement>) {
        setAnchorEl(ev.currentTarget);
    }

    function handleClose() {
        setAnchorEl(undefined);
    }

    return (
        <Stack direction="row" gap={1} alignItems="center">
            <UserLabel user={user} />
            <NotificationBell />
            <IconButton aria-label="settings" onClick={handleClick}>
                <Settings fontSize="large" />
            </IconButton>
            {user?.authType !== "oauth" ? (
                <AnonymousMenu handleClose={handleClose} anchorEl={anchorEl} />
            ) : (
                <AuthorizedMenu
                    user={user}
                    handleClose={handleClose}
                    anchorEl={anchorEl}
                />
            )}
        </Stack>
    );
}
