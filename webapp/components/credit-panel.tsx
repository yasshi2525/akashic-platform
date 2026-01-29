"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Collapse,
    Container,
    Divider,
    Skeleton,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useLicense } from "@/lib/client/useLicense";

export function CreditPanel({
    credit,
    contentId,
}: {
    credit?: string;
    contentId: number;
}) {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const { license, isLoading, error } = useLicense(contentId);

    return (
        <Stack spacing={1}>
            <Button
                variant="outlined"
                size="small"
                onClick={() => setOpen((prev) => !prev)}
                endIcon={open ? <ExpandLess /> : <ExpandMore />}
                sx={{ alignSelf: "flex-start" }}
            >
                {open ? "クレジットを閉じる" : "クレジットを表示"}
            </Button>
            <Collapse in={open}>
                <Stack spacing={1}>
                    {credit ? (
                        <Box>
                            <Typography variant="subtitle2">
                                クレジット
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ whiteSpace: "pre-wrap" }}
                            >
                                {credit}
                            </Typography>
                        </Box>
                    ) : null}
                    {credit && license ? <Divider /> : null}
                    {isLoading ? (
                        <Container maxWidth="md" sx={{ py: 2 }}>
                            <Skeleton variant="rectangular" height={240} />
                        </Container>
                    ) : null}
                    {error ? (
                        <Typography variant="body2" color="error">
                            ライセンスファイルの読み込みに失敗しました。
                        </Typography>
                    ) : null}
                    {license ? (
                        <Box>
                            <Typography variant="subtitle2">
                                ライブラリライセンス
                            </Typography>
                            <Typography
                                variant="body2"
                                fontSize="small"
                                sx={{
                                    color: theme.palette.text.secondary,
                                    fontFamily: "monospace",
                                    whiteSpace: "pre-wrap",
                                }}
                            >
                                {license}
                            </Typography>
                        </Box>
                    ) : null}
                </Stack>
            </Collapse>
        </Stack>
    );
}
