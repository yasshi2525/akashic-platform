"use client";

import { useState } from "react";
import {
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from "@mui/material";
import { MoreVert, VisibilityOff, Visibility } from "@mui/icons-material";
import { MuteTargetMessage, useMute } from "@/lib/client/useMute";

export function MuteMenu({
    message,
    mute,
}: {
    message: MuteTargetMessage;
    mute: ReturnType<typeof useMute>;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const muted = mute.isMuted(message);

    // 匿名キーも投稿者 ID も無い投稿 (削除済みユーザーなど) は対象にできない
    if (!message.author.anonKey) {
        return null;
    }

    return (
        <>
            <IconButton
                size="small"
                aria-label="投稿の操作"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                disabled={mute.pending}
            >
                <MoreVert fontSize="inherit" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem
                    onClick={() => {
                        mute.toggle(message);
                        setAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        {muted ? (
                            <Visibility fontSize="small" />
                        ) : (
                            <VisibilityOff fontSize="small" />
                        )}
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            muted
                                ? "この人のミュートを解除"
                                : "この人をミュート"
                        }
                        secondary={
                            mute.isPersisted
                                ? undefined
                                : "サインインすると他の端末にも引き継げます"
                        }
                    />
                </MenuItem>
            </Menu>
        </>
    );
}
