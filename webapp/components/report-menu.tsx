"use client";

import { useState } from "react";
import {
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from "@mui/material";
import { Flag, MoreVert } from "@mui/icons-material";
import { ReportTargetInput } from "@/lib/types";
import { ReportDialog } from "./report-dialog";

/**
 * 部屋・ユーザーの通報導線。通報を直接ボタンで見せず、投稿と同じ三点リーダー
 * の下に置いて目立たせない。
 */
export function ReportMenu({
    target,
    ariaLabel,
    dialogTitle,
    dialogDescription,
    color = "inherit",
    size = "small",
}: {
    target: ReportTargetInput;
    ariaLabel: string;
    dialogTitle: string;
    dialogDescription: string;
    color?: "inherit" | "action";
    size?: "small" | "medium";
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [reportOpen, setReportOpen] = useState(false);

    return (
        <>
            <IconButton
                size={size}
                aria-label={ariaLabel}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                    color: color === "inherit" ? "text.secondary" : undefined,
                }}
            >
                <MoreVert fontSize={size === "small" ? "inherit" : "medium"} />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem
                    onClick={() => {
                        setReportOpen(true);
                        setAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        <Flag fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="通報する" />
                </MenuItem>
            </Menu>
            <ReportDialog
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                target={target}
                title={dialogTitle}
                description={dialogDescription}
            />
        </>
    );
}
