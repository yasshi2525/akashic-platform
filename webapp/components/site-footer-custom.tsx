"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useCustomFooter } from "@/lib/client/useCustomFooter";

export function SiteCustomFooter() {
    const { customFooterLabel, customFooterImagePath, customFooterImageWidth } =
        useCustomFooter();
    if (!customFooterLabel && !customFooterImagePath) {
        return null;
    }
    return (
        <Stack direction="row" alignSelf="center" alignItems="center">
            {customFooterImagePath ? (
                <Box
                    component="img"
                    src={customFooterImagePath}
                    alt={customFooterLabel}
                    sx={{
                        width: customFooterImageWidth ?? "auto",
                        height: "auto",
                        display: "block",
                    }}
                />
            ) : null}
            {customFooterLabel ? (
                <Typography variant="body1" component="span">
                    {customFooterLabel}
                </Typography>
            ) : null}
        </Stack>
    );
}
