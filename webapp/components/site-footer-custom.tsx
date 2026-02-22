"use client";

import { ReactNode } from "react";
import { Box, Button, Link, Stack, Typography, useTheme } from "@mui/material";
import { useCustomFooter } from "@/lib/client/useCustomFooter";

function LinkIf({ href, children }: { href?: string; children: ReactNode }) {
    if (href == null) {
        return <>{children}</>;
    } else {
        return (
            <Button
                component={Link}
                href={href}
                target="_blank"
                rel="noreferrer"
                color="inherit"
            >
                {children}
            </Button>
        );
    }
}

export function SiteCustomFooter() {
    const theme = useTheme();
    const {
        customFooterHref,
        customFooterLabel,
        customFooterImagePath,
        customFooterImageWidth,
    } = useCustomFooter();
    if (!customFooterLabel && !customFooterImagePath) {
        return null;
    }
    return (
        <Stack
            direction="row"
            alignSelf="center"
            alignItems="center"
            color={theme.palette.text.secondary}
        >
            <Typography variant="body2" component="span">
                Sponsored by
            </Typography>
            {customFooterImagePath ? (
                <LinkIf href={customFooterHref}>
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
                </LinkIf>
            ) : null}
            {customFooterLabel ? (
                customFooterHref ? (
                    <Link
                        href={customFooterHref}
                        target="_blank"
                        color="inherit"
                        variant="body1"
                    >
                        {customFooterLabel}
                    </Link>
                ) : (
                    <Typography variant="body1" component="span">
                        {customFooterLabel}
                    </Typography>
                )
            ) : null}
        </Stack>
    );
}
