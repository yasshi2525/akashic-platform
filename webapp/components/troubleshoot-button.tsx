"use client";

import { IconButton, Tooltip } from "@mui/material";
import { Report } from "@mui/icons-material";

export function TroubleshootButton({ onClick }: { onClick: () => void }) {
    return (
        <Tooltip
            arrow
            title="プレイ中に意図しない動作が発生したことを投稿主に報告します。詳細情報を添付して送ります。"
        >
            <IconButton aria-label="不具合を報告" onClick={onClick}>
                <Report fontSize="large" color="warning" />
            </IconButton>
        </Tooltip>
    );
}
