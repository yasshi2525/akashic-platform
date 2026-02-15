"use client";

import { useEffect, useState } from "react";
import { Alert, Box } from "@mui/material";

type ShutdownStatus = {
    enabled: boolean;
    reason?: string;
    updatedAt: number;
};

export function ShutdownBanner({
    initialState,
}: {
    initialState: ShutdownStatus;
}) {
    const [state, setState] = useState(initialState);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch("/api/internal/shutdown", {
                    method: "GET",
                    cache: "no-store",
                });
                if (!res.ok) {
                    return;
                }
                const json = (await res.json()) as {
                    ok: boolean;
                    enabled: boolean;
                    reason?: string;
                    updatedAt: number;
                };
                if (!cancelled && json.ok) {
                    setState({
                        enabled: json.enabled,
                        reason: json.reason,
                        updatedAt: json.updatedAt,
                    });
                }
            } catch {
                // ignore polling failure
            }
        };
        void load();
        const intervalId = setInterval(() => {
            void load();
        }, 5000);
        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, []);

    if (!state.enabled) {
        return null;
    }

    return (
        <Box sx={{ px: 2, pt: 2 }}>
            <Alert severity="warning" variant="filled">
                メンテナンス中です。部屋の作成・延長、コンテンツ投稿・更新を停止しています。
                {state.reason ? ` (${state.reason})` : ""}
            </Alert>
        </Box>
    );
}
