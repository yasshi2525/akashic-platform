"use client";

import Link from "next/link";
import {
    Delete,
    FileUpload,
    OpenInNew,
    Person,
    ReadMore,
    SportsEsports,
} from "@mui/icons-material";
import {
    Box,
    Button,
    Container,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";

export default function HelpPage() {
    const theme = useTheme();
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack
                spacing={3}
                sx={{
                    px: { xs: 2, sm: 4 },
                    py: 2,
                    bgcolor: theme.palette.background.paper,
                }}
            >
                <Typography variant="h4" component="h1" textAlign="center">
                    ヘルプ
                </Typography>
                <Box>
                    <Typography variant="h6" component="h2">
                        みんなでゲーム! とは？
                    </Typography>
                    <Typography
                        variant="body1"
                        gutterBottom
                        sx={{
                            pl: { xs: 1, sm: 4 },
                            color: theme.palette.text.secondary,
                        }}
                    >
                        複数人同時プレイ型のゲームを投稿でき、公開されたゲームをみんなで遊べるサイトです。
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" component="h2">
                        使い方
                    </Typography>
                    <List disablePadding>
                        <ListItem
                            disablePadding
                            sx={{ pl: { xs: 0.5, sm: 2 } }}
                        >
                            <ListItemIcon>
                                <SportsEsports />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body1">
                                        遊ぶ
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="body1"
                                        color={theme.palette.text.secondary}
                                    >
                                        部屋を立て、表示されたURLを招待したい人に送ります。
                                        招待された人はそのリンクにアクセスすると参加できます。
                                        部屋は誰でも自由に参加でき、サインイン不要です。
                                    </Typography>
                                }
                            />
                        </ListItem>
                        <ListItem
                            disablePadding
                            sx={{ pl: { xs: 0.5, sm: 2 } }}
                        >
                            <ListItemIcon>
                                <FileUpload />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body1">
                                        投稿
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="body1"
                                        color={theme.palette.text.secondary}
                                    >
                                        メニューから投稿できます。
                                        投稿にはサインインが必要です。
                                    </Typography>
                                }
                            />
                        </ListItem>
                    </List>
                </Box>
                <Box>
                    <Typography variant="h6" component="h2">
                        便利な使い方
                    </Typography>
                    <List disablePadding>
                        <ListItem
                            disableGutters
                            sx={{ pl: { xs: 0.5, sm: 2 } }}
                        >
                            <ListItemIcon>
                                <Person />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body1">
                                        名前
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="body1"
                                        color={theme.palette.text.secondary}
                                    >
                                        一部ゲームは名前を使って参加できます。
                                        サインインしていると名前の入力を省略できます。
                                    </Typography>
                                }
                            />
                        </ListItem>
                        <ListItem
                            disableGutters
                            sx={{ pl: { xs: 0.5, sm: 2 } }}
                        >
                            <ListItemIcon>
                                <ReadMore />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body1">
                                        延長
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="body1"
                                        color={theme.palette.text.secondary}
                                    >
                                        部屋は30分で自動終了しますが、
                                        残り時間が少なくなったときに参加者の誰かが
                                        延長ボタンを押すと残り時間を伸ばせます。
                                        延長回数に制限はありません。
                                    </Typography>
                                }
                            />
                        </ListItem>
                        <ListItem
                            disableGutters
                            sx={{ pl: { xs: 0.5, sm: 2 } }}
                        >
                            <ListItemIcon>
                                <Delete />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body1">
                                        終了
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="body1"
                                        color={theme.palette.text.secondary}
                                    >
                                        部屋を立てた人はいつでも部屋を閉じることができます。
                                    </Typography>
                                }
                            />
                        </ListItem>
                    </List>
                </Box>
                <Box>
                    <Typography variant="h6" component="h2">
                        投稿できるゲーム
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            pl: { xs: 1, sm: 4 },
                            color: theme.palette.text.secondary,
                        }}
                    >
                        <Button
                            component={Link}
                            endIcon={<OpenInNew />}
                            href="https://akashic-games.github.io/"
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                                textTransform: "none",
                                color: theme.palette.primary.light,
                            }}
                        >
                            Akashic Engine
                        </Button>{" "}
                        を使って作られたゲームが投稿できます。Akashic Engine は
                        DWANGO が提供する 2D ゲームエンジンで、
                        複数人プレイ向けの仕組みを備えています。
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            pl: { xs: 1, sm: 4 },
                        }}
                    >
                        投稿できるゲームは下記の通りです。{" "}
                        <code>game.json</code> を確認してください。
                    </Typography>
                    <List
                        dense
                        disablePadding
                        sx={{
                            listStyleType: "disc",
                            pl: { xs: 2, sm: 6 },
                            color: theme.palette.text.secondary,
                            fontSize: theme.typography.body2.fontSize,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                        }}
                    >
                        <ListItem disableGutters sx={{ display: "list-item" }}>
                            <code>environment.sandbox-runtime</code>: "3"
                        </ListItem>
                        <ListItem disableGutters sx={{ display: "list-item" }}>
                            <code>environment.nicolive.supportedModes</code>:
                            <code>"multi_admission"</code> または{" "}
                            <code>"multi"</code>
                        </ListItem>
                        <ListItem disableGutters sx={{ display: "list-item" }}>
                            <code>environment.external</code>: "coe" および
                            "coeLimited" に対応。
                            <br />
                            <code>
                                @akashic-extension/instance-storage
                            </code>{" "}
                            は機能しない点に注意してください。
                        </ListItem>
                    </List>
                </Box>
            </Stack>
        </Container>
    );
}
