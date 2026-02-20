"use client";

import { Alert, Box } from "@mui/material";
import { DrainStatus, useDrain } from "@/lib/client/useDrain";

export function DrainBanner({ initialState }: { initialState: DrainStatus }) {
    const { state } = useDrain(initialState);

    if (!state.enabled) {
        return null;
    }

    return (
        <Box maxWidth="md" alignSelf="center" sx={{ px: 2, pt: 2 }}>
            <Alert severity="warning" variant="outlined">
                現在臨時メンテナンス中です。部屋の作成・延長、コンテンツ投稿を停止しています。
                {state.reason ? ` (${state.reason})` : ""}
            </Alert>
        </Box>
    );
}
