"use client";

import { ReactNode } from "react";
import { format } from "date-fns";
import {
    Avatar,
    Button,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { GameInfo } from "@/lib/types";

function Loading() {
    return (
        <TableRow>
            <TableCell colSpan={4}>
                <Skeleton variant="rounded" width="100%" />
            </TableCell>
        </TableRow>
    );
}

function NoResult() {
    const theme = useTheme();
    return (
        <TableRow>
            <TableCell colSpan={4}>
                <Typography
                    variant="body1"
                    color={theme.palette.text.secondary}
                    align="center"
                >
                    ゲームが見つかりませんでした
                </Typography>
            </TableCell>
        </TableRow>
    );
}

function GameTableCells({
    list,
    renderActions,
}: {
    list: GameInfo[];
    renderActions?: (game: GameInfo, isTable: boolean) => ReactNode;
}) {
    const theme = useTheme();

    return list.map((game) => (
        <TableRow key={game.contentId} hover>
            <TableCell>
                <Stack direction="row" spacing={2}>
                    <Avatar
                        variant="square"
                        src={game.iconURL}
                        sx={{
                            width: 96,
                            height: 96,
                        }}
                    />
                    <Stack spacing={1}>
                        <Typography variant="body1">{game.title}</Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                            }}
                        >
                            {game.description}
                        </Typography>
                    </Stack>
                </Stack>
            </TableCell>
            <TableCell>
                <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                >
                    {format(game.createdAt, "yyyy/MM/dd")}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography
                    variant="body2"
                    sx={{
                        color: theme.palette.text.secondary,
                        width: "max-content",
                    }}
                >
                    {game.playCount} 回
                </Typography>
            </TableCell>
            <TableCell
                sx={{
                    whiteSpace: "nowrap",
                }}
            >
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    gap={1}
                    sx={{ width: "max-content" }}
                >
                    {renderActions?.(game, true)}
                </Stack>
            </TableCell>
        </TableRow>
    ));
}

export function GameListTable({
    list,
    isLoading,
    isEmpty,
    isEnd,
    onLoadMore,
    renderActions,
}: {
    list?: GameInfo[];
    isLoading: boolean;
    isEmpty: boolean;
    isEnd: boolean;
    onLoadMore: () => void;
    renderActions?: (game: GameInfo, isTable: boolean) => ReactNode;
}) {
    const theme = useTheme();
    const isTable = useMediaQuery(theme.breakpoints.up("md"));

    if (!isTable) {
        return (
            <Stack spacing={2}>
                {isLoading ? (
                    <Skeleton variant="rounded" width="100%" height={120} />
                ) : list == null || isEmpty ? (
                    <Typography
                        variant="body1"
                        color={theme.palette.text.secondary}
                        align="center"
                    >
                        ゲームが見つかりませんでした
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {list.map((game) => (
                            <Paper
                                key={game.contentId}
                                sx={{ padding: 2 }}
                                variant="outlined"
                            >
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={2}>
                                        <Avatar
                                            variant="square"
                                            src={game.iconURL}
                                            sx={{
                                                width: 72,
                                                height: 72,
                                            }}
                                        />
                                        <Stack spacing={0.5}>
                                            <Typography variant="body1">
                                                {game.title}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: theme.palette.text
                                                        .secondary,
                                                    overflowWrap: "anywhere",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {game.description}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                    <Stack
                                        direction="row"
                                        spacing={2}
                                        justifyContent="space-between"
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: theme.palette.text
                                                    .secondary,
                                            }}
                                        >
                                            投稿日:{" "}
                                            {format(
                                                game.createdAt,
                                                "yyyy/MM/dd",
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: theme.palette.text
                                                    .secondary,
                                            }}
                                        >
                                            プレイ数: {game.playCount} 回
                                        </Typography>
                                    </Stack>
                                    {renderActions ? (
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{ width: "max-content" }}
                                        >
                                            {renderActions(game, false)}
                                        </Stack>
                                    ) : null}
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}
                {!isLoading && list != null && !isEmpty && !isEnd ? (
                    <Button
                        onClick={onLoadMore}
                        sx={{
                            backgroundColor: theme.palette.background.paper,
                        }}
                        size="large"
                    >
                        もっと読む
                    </Button>
                ) : null}
            </Stack>
        );
    }

    return (
        <TableContainer component={Paper}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>ゲーム名</TableCell>
                        <TableCell>投稿日</TableCell>
                        <TableCell
                            sx={{
                                width: "max-content",
                                whiteSpace: "nowrap",
                            }}
                        >
                            プレイ数
                        </TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                {isLoading ? (
                    <TableBody>
                        <Loading />
                    </TableBody>
                ) : list == null || isEmpty ? (
                    <TableBody>
                        <NoResult />
                    </TableBody>
                ) : (
                    <TableBody>
                        <GameTableCells
                            list={list}
                            renderActions={renderActions}
                        />
                        {!isEnd ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    sx={{ textAlign: "center" }}
                                >
                                    <Button
                                        onClick={onLoadMore}
                                        sx={{
                                            backgroundColor:
                                                theme.palette.background.paper,
                                        }}
                                        size="large"
                                    >
                                        もっと読む
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : null}
                    </TableBody>
                )}
            </Table>
        </TableContainer>
    );
}
