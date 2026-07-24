"use client";

import { ReactNode, useState } from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { VisibilityOff } from "@mui/icons-material";

// タッチターゲットとして確保する最小高さ
const BAR_MIN_HEIGHT = 32;

/**
 * ミュートした投稿は完全には消さず折りたたむ。会話の流れを追えなくなると
 * 前後の文脈が読めず、かえって不安を招くため。
 */
export function MutedMessage({ children }: { children: ReactNode }) {
    const [revealed, setRevealed] = useState(false);

    if (revealed) {
        return (
            <Box sx={{ opacity: 0.6 }}>
                <ButtonBase
                    onClick={() => setRevealed(false)}
                    sx={{ mb: 0.25 }}
                >
                    <Typography variant="caption" color="textSecondary">
                        ミュート中の投稿を表示しています（クリックで隠す）
                    </Typography>
                </ButtonBase>
                {children}
            </Box>
        );
    }

    return (
        <ButtonBase
            onClick={() => setRevealed(true)}
            sx={{
                width: "100%",
                minHeight: BAR_MIN_HEIGHT,
                justifyContent: "flex-start",
                textAlign: "left",
                borderRadius: 1,
                px: 0.5,
            }}
        >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <VisibilityOff fontSize="inherit" color="disabled" />
                <Typography variant="caption" color="textSecondary">
                    ミュート中の投稿です（クリックで表示）
                </Typography>
            </Stack>
        </ButtonBase>
    );
}
