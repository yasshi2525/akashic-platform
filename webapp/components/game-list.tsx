"use client";

import { useDebounce } from "use-debounce";
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
    useTheme,
} from "@mui/material";
import { CheckBox } from "@mui/icons-material";
import { GameInfo } from "@/lib/types";
import { useGameList } from "@/lib/client/useGameList";
import { UserInline } from "./user-inline";

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
    selected,
    setSelected,
    setGameTitle,
}: {
    list: GameInfo[];
    selected?: number;
    setSelected: (selected?: number) => void;
    setGameTitle: (title?: string) => void;
}) {
    const theme = useTheme();
    function handleClick(id: number, title: string) {
        if (id === selected) {
            setSelected(undefined);
            setGameTitle(undefined);
        } else {
            setSelected(id);
            setGameTitle(title);
        }
    }

    return list.map((game) => (
        <TableRow
            key={game.contentId}
            hover
            onClick={() => handleClick(game.contentId, game.title)}
            sx={{
                cursor: "pointer",
                bgcolor:
                    selected === game.contentId
                        ? theme.palette.action.selected
                        : "inherit",
            }}
        >
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
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body1">
                                {game.title}
                            </Typography>
                            {!game.streaming ? (
                                <Typography variant="body2" color="error">
                                    実況不可
                                </Typography>
                            ) : null}
                        </Stack>
                        <Typography
                            variant="body2"
                            sx={{ color: theme.palette.text.secondary }}
                        >
                            {game.description}
                        </Typography>
                    </Stack>
                </Stack>
            </TableCell>
            <TableCell>
                <UserInline
                    user={{
                        id: game.publisher.id,
                        name: game.publisher.name,
                        image: game.publisher.image,
                    }}
                    textVariant="body1"
                    avatarSize={24}
                />
            </TableCell>
            <TableCell width={120}>
                <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                >
                    {game.playCount} 回
                </Typography>
            </TableCell>
            <TableCell width={100}>
                {selected === game.contentId ? (
                    <CheckBox fontSize="large" />
                ) : null}
            </TableCell>
        </TableRow>
    ));
}

export function GameList({
    keyword,
    selected,
    setSelected,
    setGameTitle,
}: {
    keyword?: string;
    selected?: number;
    setSelected: (selected?: number) => void;
    setGameTitle: (title?: string) => void;
}) {
    const theme = useTheme();
    const [debouncedKeyword] = useDebounce(keyword, 500);
    const { isLoading, list, page, setPage, isEmpty, isEnd } =
        useGameList(debouncedKeyword);

    function handleClickMore() {
        setPage(page + 1);
    }

    return (
        <TableContainer component={Paper}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>ゲーム名</TableCell>
                        <TableCell>制作者</TableCell>
                        <TableCell>プレイ数</TableCell>
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
                            list={list.flat()}
                            selected={selected}
                            setSelected={setSelected}
                            setGameTitle={setGameTitle}
                        />
                        {!isEnd ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    sx={{ textAlign: "center" }}
                                >
                                    <Button
                                        onClick={handleClickMore}
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
