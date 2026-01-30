"use client";

import {
    Alert,
    Avatar,
    Box,
    Card,
    CardContent,
    Container,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { FeedbackPost, GameInfo, User } from "@/lib/types";
import { FeedbackPanel } from "./feedback-panel";
import { CreditPanel } from "./credit-panel";
import { UserInline } from "./user-inline";

export function GameDetailClient({
    gameInfo,
    feedbackList,
    isPublisher,
    user,
    onRefresh,
    error,
}: {
    gameInfo: GameInfo | null;
    feedbackList: FeedbackPost[];
    isPublisher: boolean;
    user: User | null;
    onRefresh?: () => void;
    error?: string;
}) {
    const theme = useTheme();

    if (error || !gameInfo) {
        return (
            <Container maxWidth="md" sx={{ py: 2 }}>
                <Alert severity="error" variant="outlined">
                    {error ?? "ゲーム情報の取得に失敗しました。"}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 2 }}>
            <Card>
                <CardContent>
                    <Stack spacing={2}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                        >
                            <Avatar
                                variant="square"
                                src={gameInfo.iconURL}
                                sx={{ width: 160, height: 160 }}
                            />
                            <Stack spacing={1} sx={{ flexGrow: 1 }}>
                                <Typography variant="h4" component="h1">
                                    {gameInfo.title}
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        投稿者
                                    </Typography>
                                    <UserInline
                                        user={{
                                            id: gameInfo.publisher.id,
                                            name: gameInfo.publisher.name,
                                            image: gameInfo.publisher.image,
                                        }}
                                        textVariant="body2"
                                        avatarSize={20}
                                    />
                                </Stack>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Typography
                                        variant="body2"
                                        color={theme.palette.text.secondary}
                                    >
                                        プレイ数
                                    </Typography>
                                    <Typography variant="body2">
                                        {gameInfo.playCount.toLocaleString()}
                                    </Typography>
                                </Stack>
                                <Typography
                                    variant="body1"
                                    sx={{ whiteSpace: "pre-wrap" }}
                                >
                                    {gameInfo.description}
                                </Typography>
                                <CreditPanel
                                    credit={gameInfo.credit}
                                    contentId={gameInfo.contentId}
                                />
                            </Stack>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <Box id="feedback" sx={{ mt: 3 }}>
                <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                    フィードバック
                </Typography>
                <FeedbackPanel
                    gameId={gameInfo.id}
                    feedbackList={feedbackList}
                    isPublisher={isPublisher}
                    user={user}
                    onRefresh={onRefresh}
                />
            </Box>
        </Container>
    );
}
