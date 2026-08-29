"use client";

import { useState } from "react";
import {
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from "@mui/material";
import { Flag, MoreVert, VisibilityOff, Visibility } from "@mui/icons-material";
import { MuteTargetMessage, useMute } from "@/lib/client/useMute";
import { ReportSource } from "@/lib/types";
import { ReportDialog } from "./report-dialog";

export function MuteMenu({
    message,
    mute,
    source,
}: {
    message: MuteTargetMessage;
    mute: ReturnType<typeof useMute>;
    source: ReportSource;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [reportOpen, setReportOpen] = useState(false);
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
                <Divider />
                <MenuItem
                    onClick={() => {
                        setReportOpen(true);
                        setAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        <Flag fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="この投稿を通報" />
                </MenuItem>
            </Menu>
            <ReportDialog
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                target={{ kind: "message", source, messageId: message.id }}
                title="投稿を通報"
            />
        </>
    );
}
