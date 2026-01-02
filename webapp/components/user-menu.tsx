"use client";

import { MouseEvent, useState } from "react";
import {
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { AddCircle, Settings } from "@mui/icons-material";
import { useAuth } from "@/lib/client/useAuth";
import { UserLabel } from "./user-label";
import { SignIn } from "./sign-in";
import Link from "next/link";

export function UserMenu() {
    const theme = useTheme();
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
            <IconButton aria-label="settings" onClick={handleClick}>
                <Settings fontSize="large" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}
                onClick={handleClose}
            >
                {user?.authType !== "oauth" ? (
                    <MenuItem>
                        <SignIn />
                    </MenuItem>
                ) : (
                    <MenuItem>
                        <Link
                            href="/new-game"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                textDecoration: "none",
                                color: "inherit",
                            }}
                        >
                            <AddCircle />
                            <Typography variant="body1" sx={{ ml: 1 }}>
                                ゲームを投稿
                            </Typography>
                        </Link>
                    </MenuItem>
                )}
            </Menu>
        </Stack>
    );
}
