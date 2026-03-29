"use client";

import { IconButton, Tooltip } from "@mui/material";
import { BugReport } from "@mui/icons-material";

export function TroubleshootButton({ onClick }: { onClick: () => void }) {
    return (
        <Tooltip
            arrow
            title="投稿主に詳細情報を送ることで、意図しない挙動の原因特定に役立つかもしれません"
        >
            <IconButton aria-label="詳細ログを送信" onClick={onClick}>
                <BugReport fontSize="large" />
            </IconButton>
        </Tooltip>
    );
}
