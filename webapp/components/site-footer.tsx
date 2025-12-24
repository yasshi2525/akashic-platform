"use client";

import { Box, Container, Typography, useTheme } from "@mui/material";

export function SiteFooter() {
    const theme = useTheme();

    return (
        <Box
            component="footer"
            sx={{
                borderTop: 1,
                bgcolor: theme.palette.background.paper,
                borderColor: theme.palette.background.default,
            }}
        >
            <Container maxWidth="xl">
                <Typography variant="body2" align="center">
                    © 2025 みんなでゲーム! All rights reserved.
                </Typography>
            </Container>
        </Box>
    );
}
