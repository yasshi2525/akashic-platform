"use client";

import { MouseEvent, useState } from "react";
import { useDebounce } from "use-debounce";
import {
    Avatar,
    Button,
    Divider,
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
import { CheckBox, StarOutlined } from "@mui/icons-material";
import { GameInfo } from "@/lib/types";
import { useGameList } from "@/lib/client/useGameList";
import { useFavorites } from "@/lib/client/useFavorites";
import { useAuth } from "@/lib/client/useAuth";
import { UserInline } from "./user-inline";
import { GameDescription } from "./text-with-links";
import { FavoriteButton } from "./favorite-button";

function Loading() {
    return (
        <TableRow>
            <TableCell colSpan={5}>
                <Skeleton variant="rounded" width="100%" />
            </TableCell>
        </TableRow>
    );
}

function NoResult() {
    const theme = useTheme();
    return (
        <TableRow>
            <TableCell colSpan={5}>
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
    expandedSet,
    onToggleDescription,
    showFavoriteButton,
    favoriteGameIds,
    onFavoriteAdd,
    onFavoriteRemove,
}: {
    list: GameInfo[];
    selected?: number;
    setSelected: (selected?: number) => void;
    setGameTitle: (title?: string) => void;
    expandedSet: Set<number>;
    onToggleDescription: (e: MouseEvent, id: number) => void;
    showFavoriteButton: boolean;
    favoriteGameIds: Set<number>;
    onFavoriteAdd: (gameId: number) => Promise<boolean>;
    onFavoriteRemove: (gameId: number) => Promise<boolean>;
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
                            {!game.streaming && (
                                <Typography variant="body2" color="error">
                                    実況不可
                                </Typography>
                            )}
                        </Stack>
                        <GameDescription
                            description={game.description}
                            gameId={game.contentId}
                            expanded={expandedSet.has(game.contentId)}
                            onToggle={onToggleDescription}
                        />
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
                    {game.playCount.toLocaleString()} 回
                </Typography>
            </TableCell>
            {showFavoriteButton && (
                <TableCell width={56}>
                    <FavoriteButton
                        gameId={game.id}
                        isFavorited={favoriteGameIds.has(game.id)}
                        onAdd={onFavoriteAdd}
                        onRemove={onFavoriteRemove}
                        size="small"
                    />
                </TableCell>
            )}
            <TableCell width={100}>
                {selected === game.contentId && <CheckBox fontSize="large" />}
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
    const isTable = useMediaQuery(theme.breakpoints.up("md"));
    const [debouncedKeyword] = useDebounce(keyword, 500);
    const { isLoading, list, page, setPage, isEmpty, isEnd } =
        useGameList(debouncedKeyword);
    const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());

    const [user] = useAuth();
    const isOAuth = user?.authType === "oauth";
    const { favorites, favoriteGameIds, add, remove } = useFavorites();

    const filteredFavorites = debouncedKeyword
        ? favorites.filter(
              (g) =>
                  g.title.includes(debouncedKeyword) ||
                  g.description.includes(debouncedKeyword),
          )
        : favorites;

    function handleToggleDescription(e: MouseEvent, id: number) {
        e.stopPropagation();
        setExpandedSet((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function handleClick(id: number, title: string) {
        if (id === selected) {
            setSelected(undefined);
            setGameTitle(undefined);
        } else {
            setSelected(id);
            setGameTitle(title);
        }
    }

    function handleClickMore() {
        setPage(page + 1);
    }

    const showFavoriteSection = isOAuth && filteredFavorites.length > 0;

    if (!isTable) {
        function renderCard(game: GameInfo) {
            return (
                <Paper
                    key={game.contentId}
                    sx={{
                        padding: 2,
                        cursor: "pointer",
                        bgcolor:
                            selected === game.contentId
                                ? theme.palette.action.selected
                                : "inherit",
                    }}
                    variant="outlined"
                    onClick={() => handleClick(game.contentId, game.title)}
                >
                    <Stack spacing={1.5}>
                        <Stack direction="row" spacing={2}>
                            <Avatar
                                variant="square"
                                src={game.iconURL}
                                sx={{ width: 72, height: 72 }}
                            />
                            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Typography variant="body1">
                                        {game.title}
                                    </Typography>
                                    {!game.streaming && (
                                        <Typography
                                            variant="body2"
                                            color="error"
                                        >
                                            実況不可
                                        </Typography>
                                    )}
                                    {selected === game.contentId && (
                                        <CheckBox fontSize="small" />
                                    )}
                                </Stack>
                                <GameDescription
                                    description={game.description}
                                    gameId={game.contentId}
                                    expanded={expandedSet.has(game.contentId)}
                                    onToggle={handleToggleDescription}
                                />
                            </Stack>
                        </Stack>
                        <Stack
                            direction="row"
                            spacing={2}
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <UserInline
                                user={{
                                    id: game.publisher.id,
                                    name: game.publisher.name,
                                    image: game.publisher.image,
                                }}
                                textVariant="body2"
                                avatarSize={20}
                            />
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                    }}
                                >
                                    プレイ数:{" "}
                                    {game.playCount.toLocaleString()} 回
                                </Typography>
                                {isOAuth && (
                                    <FavoriteButton
                                        gameId={game.id}
                                        isFavorited={favoriteGameIds.has(game.id)}
                                        onAdd={add}
                                        onRemove={remove}
                                        size="small"
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Stack>
                </Paper>
            );
        }

        return (
            <Stack spacing={2}>
                {showFavoriteSection && (
                    <>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <StarOutlined fontSize="small" color="warning" />
                            <Typography variant="subtitle2" color="text.secondary">
                                お気に入り
                            </Typography>
                        </Stack>
                        <Stack spacing={2}>
                            {filteredFavorites.map(renderCard)}
                        </Stack>
                        <Divider />
                    </>
                )}
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
                        {list.flat().map(renderCard)}
                    </Stack>
                )}
                {!isLoading && list != null && !isEmpty && !isEnd && (
                    <Button
                        onClick={handleClickMore}
                        sx={{
                            backgroundColor: theme.palette.background.paper,
                        }}
                        size="large"
                    >
                        もっと読む
                    </Button>
                )}
            </Stack>
        );
    }

    const colSpan = isOAuth ? 5 : 4;

    return (
        <TableContainer component={Paper}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>ゲーム名</TableCell>
                        <TableCell>制作者</TableCell>
                        <TableCell
                            sx={{
                                width: "max-content",
                                whiteSpace: "nowrap",
                            }}
                        >
                            プレイ数
                        </TableCell>
                        {isOAuth && <TableCell width={56} />}
                        <TableCell />
                    </TableRow>
                </TableHead>
                {showFavoriteSection && (
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={colSpan} sx={{ pb: 0, pt: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <StarOutlined fontSize="small" color="warning" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        お気に入り
                                    </Typography>
                                </Stack>
                            </TableCell>
                        </TableRow>
                        <GameTableCells
                            list={filteredFavorites}
                            selected={selected}
                            setSelected={setSelected}
                            setGameTitle={setGameTitle}
                            expandedSet={expandedSet}
                            onToggleDescription={handleToggleDescription}
                            showFavoriteButton={true}
                            favoriteGameIds={favoriteGameIds}
                            onFavoriteAdd={add}
                            onFavoriteRemove={remove}
                        />
                        <TableRow>
                            <TableCell colSpan={colSpan} sx={{ p: 0 }}>
                                <Divider />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                )}
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
                            expandedSet={expandedSet}
                            onToggleDescription={handleToggleDescription}
                            showFavoriteButton={isOAuth}
                            favoriteGameIds={favoriteGameIds}
                            onFavoriteAdd={add}
                            onFavoriteRemove={remove}
                        />
                        {!isEnd && (
                            <TableRow>
                                <TableCell
                                    colSpan={colSpan}
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
                        )}
                    </TableBody>
                )}
            </Table>
        </TableContainer>
    );
}
