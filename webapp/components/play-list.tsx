"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import { formatDistance } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Container,
    Grid,
    InputAdornment,
    Skeleton,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { Add, Person, AccessTime, Search } from "@mui/icons-material";
import { PlayInfo } from "@/lib/types";
import { usePlayList } from "@/lib/client/usePlayList";

function Loading() {
    return (
        <Box>
            <Skeleton variant="rounded" width="100%" />
        </Box>
    );
}

function NoResult() {
    const theme = useTheme();
    return (
        <Box>
            <Typography
                variant="body1"
                color={theme.palette.text.secondary}
                align="center"
            >
                ゲームが見つかりませんでした
            </Typography>
        </Box>
    );
}

function PlayGrid({ list }: { list: PlayInfo[] }) {
    const theme = useTheme();
    return (
        <Grid container spacing={2}>
            {list.map((info) => (
                <Grid
                    key={info.id}
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 4,
                        lg: 3,
                    }}
                >
                    <Card
                        sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            transition: "all 0.2s",
                            "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: 6,
                            },
                        }}
                    >
                        <CardContent
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                height: "100%",
                            }}
                        >
                            <Typography variant="h6" component="h2">
                                {info.game.title}
                            </Typography>
                            <Avatar
                                variant="square"
                                src={info.game.iconURL}
                                sx={{
                                    width: 192,
                                    height: 192,
                                }}
                            />
                            <Stack
                                spacing={1}
                                sx={{
                                    my: 1,
                                    color: theme.palette.text.secondary,
                                }}
                            >
                                <Stack
                                    direction="row"
                                    sx={{
                                        alignItems: "center",
                                    }}
                                >
                                    <Person />
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 1, mr: 2 }}
                                    >
                                        ？人
                                    </Typography>
                                    <AccessTime />
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 1, flexGrow: 1 }}
                                    >
                                        {formatDistance(
                                            info.createdAt,
                                            new Date(),
                                            { addSuffix: true, locale: ja },
                                        )}
                                    </Typography>
                                </Stack>
                                <Stack
                                    direction="row"
                                    sx={{
                                        alignItems: "center",
                                    }}
                                >
                                    <Typography variant="body2">
                                        部屋主
                                    </Typography>
                                    {info.gameMaster.iconURL ? (
                                        <Avatar
                                            src={info.gameMaster.iconURL}
                                            sx={{
                                                ml: 1,
                                                width: theme.typography.h4
                                                    .fontSize,
                                                height: theme.typography.h4
                                                    .fontSize,
                                            }}
                                        />
                                    ) : null}
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                        {info.gameMaster.name}
                                    </Typography>
                                </Stack>
                            </Stack>
                            <CardActions sx={{ marginTop: "auto" }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    component={Link}
                                    href={`/play/${info.id}`}
                                    fullWidth
                                >
                                    参加する
                                </Button>
                            </CardActions>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

function LoadMore({ handleClickMore }: { handleClickMore: () => void }) {
    const theme = useTheme();
    return (
        <Button
            onClick={handleClickMore}
            sx={{
                display: "flex",
                mt: 2,
                mx: "auto",
                backgroundColor: theme.palette.background.paper,
            }}
            size="large"
        >
            もっと読む
        </Button>
    );
}

export function PlayList() {
    const theme = useTheme();
    const [keyword, setKeyword] = useState("");
    const [debouncedKeyword] = useDebounce(keyword, 500);
    const { isLoading, list, page, setPage, isEmpty, isEnd } =
        usePlayList(debouncedKeyword);

    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        setKeyword(event.target.value);
    }

    function handleClickMore() {
        setPage(page + 1);
    }

    return (
        <Container
            maxWidth="lg"
            sx={{
                py: 2,
            }}
        >
            <Stack
                direction={{
                    xs: "column",
                    md: "row",
                }}
                justifyContent="space-between"
                alignItems={{
                    xs: "start",
                    md: "center",
                }}
                spacing={1}
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h4" component="h1">
                        ゲームで遊ぶ
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        現在プレイ中の部屋
                    </Typography>
                </Box>
                <TextField
                    placeholder="ゲーム名で検索"
                    value={keyword}
                    onChange={handleSearch}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        flexGrow: 1,
                        width: {
                            xs: "100%",
                            md: "inherit",
                        },
                    }}
                />
                <Button
                    component={Link}
                    href="/new-play"
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    sx={{
                        width: {
                            xs: "100%",
                            sm: "inherit",
                        },
                        alignSelf: { xs: "center", md: "inherit" },
                    }}
                >
                    新しい部屋を作る
                </Button>
            </Stack>
            {isLoading ? (
                <Loading />
            ) : list == null || isEmpty ? (
                <NoResult />
            ) : (
                <>
                    <PlayGrid list={list.flat()} />
                    {!isEnd ? (
                        <LoadMore handleClickMore={handleClickMore} />
                    ) : null}
                </>
            )}
        </Container>
    );
}
