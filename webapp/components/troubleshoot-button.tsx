"use client";

import { IconButton, Tooltip } from "@mui/material";
import { BugReport } from "@mui/icons-material";

interface TroubleshootButtonProps {
    onClick: () => void;
}

export function TroubleshootButton({ onClick }: TroubleshootButtonProps) {
    return (
        <Tooltip
            arrow
            title="投稿主に詳細情報を送ることで、意図しない挙動の原因特定に役立つかもしれません"
        >
            <IconButton aria-label="不具合を報告" onClick={onClick}>
                <BugReport fontSize="large" />
            </IconButton>
        </Tooltip>
    );
}
