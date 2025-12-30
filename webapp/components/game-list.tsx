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

function Loading() {
    return (
        <TableRow>
            <TableCell colSpan={3}>
                <Skeleton variant="rounded" width="100%" />
            </TableCell>
        </TableRow>
    );
}

function NoResult() {
    const theme = useTheme();
    return (
        <TableRow>
            <TableCell colSpan={3}>
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
}: {
    list: GameInfo[];
    selected?: number;
    setSelected: (selected?: number) => void;
}) {
    const theme = useTheme();
    function handleClick(id: number) {
        if (id === selected) {
            setSelected(undefined);
        } else {
            setSelected(id);
        }
    }

    return list.map((game) => (
        <TableRow
            key={game.contentId}
            hover
            onClick={() => handleClick(game.contentId)}
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
                        <Typography variant="body1">{game.title}</Typography>
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
                <Typography variant="body1">{game.publisher.name}</Typography>
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
}: {
    keyword?: string;
    selected?: number;
    setSelected: (selected?: number) => void;
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
                        />
                        {!isEnd ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
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
