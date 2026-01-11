"use client";

import { ChangeEvent, useState, useOptimistic } from "react";
import { redirect } from "next/navigation";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import {
    AddCircle,
    EditNote,
    FileUpload,
    Image as ImageIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import {
    ContentErrorResponse,
    messageKey,
    messages,
    supportedAkashicModes,
    supportedAkashicVersions,
} from "@/lib/types";
import { registerContent } from "@/lib/server/content-register";
import { editContent } from "@/lib/server/content-edit";
import { useAuth } from "@/lib/client/useAuth";
import { SignInAlert } from "./sign-in-alert";
import { GameTermsAndConditions } from "./game-tac";

const VisuallyHiddenInput = styled("input")();

type GameFormProps = Partial<{
    gameId: number;
    contentId: number;
    title: string;
    iconUrl: string;
    description: string;
}>;

export function GameForm({
    gameId,
    contentId,
    title: initialTitle,
    iconUrl,
    description: initialDescription,
}: GameFormProps) {
    const [user] = useAuth();
    const theme = useTheme();
    const [title, setTitle] = useState(initialTitle ?? "");
    const [gameFile, setGameFile] = useState<File>();
    const [iconFile, setIconFile] = useState<File>();
    const [iconPreview, setIconPreview] = useState<string | undefined>(iconUrl);
    const [description, setDescription] = useState(initialDescription ?? "");
    const [sending, setIsSending] = useOptimistic(false, () => true);
    const [titleError, setTitleError] = useState<string>();
    const [gameFileError, setGameFileError] = useState<string>();
    const [iconFileError, setIconFileError] = useState<string>();
    const [descriptionError, setDescriptionError] = useState<string>();
    const [serverError, setServerError] = useState<string>();

    function handleInputTitle(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.value) {
            setTitleError(undefined);
        }
        setTitle(event.target.value);
    }

    function handleUploadGameFile(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files && event.target.files[0]) {
            setGameFileError(undefined);
            setGameFile(event.target.files[0]);
        }
    }

    function handleUploadIconFile(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files && event.target.files[0]) {
            setIconFileError(undefined);
            setIconFile(event.target.files[0]);
            setIconPreview(URL.createObjectURL(event.target.files[0]));
        }
    }

    function handleInputDescription(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.value) {
            setDescriptionError(undefined);
        }
        setDescription(event.target.value);
    }

    function handleServerErr(res: ContentErrorResponse) {
        switch (res.reason) {
            case "InvalidParams":
                setServerError(
                    "内部エラーが発生しました。入力内容を確認してもう一度投稿してください。",
                );
                break;
            case "NoGameJson":
                setServerError(
                    "不正なゲームデータファイルです。game.json が含まれていません。",
                );
                break;
            case "InvalidGameJson":
                setServerError(
                    "不正なゲームデータファイルです。game.json がJSON形式ではありません",
                );
                break;
            case "UnsupportedVersion":
                setServerError(
                    "非サポートのバージョンが指定されています。" +
                        "game.json の environment.sandbox-runtime の値を確認してください。" +
                        `(サポート: ${supportedAkashicVersions.map((v) => `"${v}"`).join()})`,
                );
                break;
            case "UnsupportedMode":
                setServerError(
                    "非サポートのモードが指定されています。" +
                        "game.json の environment.nicolive.supportedModes の値を確認してください。" +
                        `(サポート: ${supportedAkashicModes.map((m) => `"${m}"`).join()})`,
                );
                break;
            case "InternalError":
            default:
                setServerError(
                    "予期しないエラーが発生しました。時間をおいてリトライしてください。",
                );
                break;
        }
    }

    async function handleSubmit() {
        if (gameId == null || contentId == null) {
            if (!title) {
                setTitleError("ゲームタイトルを入力してください。");
            }
            if (!gameFile) {
                setGameFileError("ゲームファイルをアップロードしてください。");
            }
            if (!iconFile) {
                setIconFileError("ゲームアイコンをアップロードしてください。");
            }
            if (!description) {
                setDescriptionError("ゲーム説明を入力してください。");
            }
        }
        if (!user) {
            setServerError("サインインしてください。");
        }
        if (user) {
            setIsSending(true);
            if (gameId == null || contentId == null) {
                if (title && gameFile && iconFile && description) {
                    const res = await registerContent({
                        publisherId: user.id,
                        title,
                        gameFile,
                        iconFile,
                        description,
                    });
                    if (res.ok) {
                        redirect(
                            `/?${messageKey}=${messages.content.registerSuccessful}`,
                        );
                    } else {
                        handleServerErr(res);
                    }
                }
            } else {
                const res = await editContent({
                    gameId,
                    contentId,
                    publisherId: user.id,
                    title,
                    gameFile,
                    iconFile,
                    description,
                });
                if (res.ok) {
                    redirect(
                        `/?${messageKey}=${messages.content.editSuccessful}`,
                    );
                } else {
                    handleServerErr(res);
                }
            }
            setIsSending(false);
        }
    }

    if (!user || user.authType === "guest") {
        const message = `ゲームを${gameId == null ? "投稿" : "更新"}するにはサインインが必要です。`;
        return <SignInAlert message={message} />;
    }

    return (
        <Container
            maxWidth="lg"
            sx={{
                mt: 4,
                display: "flex",
                flexFlow: "column",
                alignItems: "center",
                gap: 4,
            }}
        >
            <Stack width="100%" direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }} />
                {gameId == null ? (
                    <AddCircle fontSize="large" />
                ) : (
                    <EditNote fontSize="large" />
                )}
                <Typography variant="h4" component="h1">
                    ゲームを{gameId == null ? "投稿" : "更新"}する
                </Typography>
                <Box sx={{ flex: 1 }} />
            </Stack>
            <Card sx={{ width: "100%" }}>
                <CardContent sx={{ p: 2 }}>
                    <Box component="form" action={handleSubmit}>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    ゲームタイトル{" "}
                                    <Typography component="span" color="error">
                                        *
                                    </Typography>
                                </Typography>
                                <TextField
                                    fullWidth
                                    placeholder="例: みんなと遊ぶゲーム"
                                    value={title}
                                    onChange={handleInputTitle}
                                />
                                {titleError ? (
                                    <Alert
                                        variant="outlined"
                                        severity="error"
                                        sx={{ mt: 1 }}
                                    >
                                        {titleError}
                                    </Alert>
                                ) : null}
                            </Box>
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    ゲームデータファイル (zip形式){" "}
                                    <Typography component="span" color="error">
                                        *
                                    </Typography>
                                </Typography>
                                <Box
                                    component="label"
                                    sx={{
                                        width: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        color: theme.palette.text.secondary,
                                        border: "2px dashed",
                                        borderColor: gameFile
                                            ? theme.palette.divider
                                            : theme.palette.primary.main,
                                        borderRadius: 2,
                                        p: 3,
                                        transition: "all 0.2s",
                                        cursor: "point",
                                        "&:hover": {
                                            bgcolor: theme.palette.primary.main,
                                        },
                                    }}
                                >
                                    <VisuallyHiddenInput
                                        type="file"
                                        accept=".zip"
                                        sx={{ display: "none" }}
                                        onChange={handleUploadGameFile}
                                    />
                                    <FileUpload fontSize="large" />
                                    <Typography
                                        variant="body1"
                                        sx={{ textTransform: "none" }}
                                    >
                                        {gameFile
                                            ? gameFile.name
                                            : "クリックしてZIPファイルを選択 または ファイルをドロップ"}
                                    </Typography>
                                </Box>
                                {gameFileError ? (
                                    <Alert
                                        variant="outlined"
                                        severity="error"
                                        sx={{ mt: 1 }}
                                    >
                                        {gameFileError}
                                    </Alert>
                                ) : null}
                            </Box>
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    ゲームアイコン{" "}
                                    <Typography component="span" color="error">
                                        *
                                    </Typography>
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Avatar
                                        variant="square"
                                        src={iconPreview}
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            border: iconPreview
                                                ? ""
                                                : "2px solid",
                                            bgcolor: "transparent",
                                            borderColor: theme.palette.divider,
                                        }}
                                    >
                                        <ImageIcon
                                            fontSize="large"
                                            color="disabled"
                                        />
                                    </Avatar>
                                    <Box width="100%">
                                        <Box
                                            component="label"
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                color: theme.palette.text
                                                    .secondary,
                                                border: "2px dashed",
                                                borderColor: iconFile
                                                    ? theme.palette.divider
                                                    : theme.palette.primary
                                                          .main,
                                                borderRadius: 2,
                                                p: 3,
                                                textAlign: "center",
                                                transition: "all 0.2s",
                                                cursor: "point",
                                                "&:hover": {
                                                    bgcolor:
                                                        theme.palette.primary
                                                            .main,
                                                },
                                            }}
                                        >
                                            <VisuallyHiddenInput
                                                type="file"
                                                accept="image/*"
                                                sx={{ display: "none" }}
                                                onChange={handleUploadIconFile}
                                            />
                                            <FileUpload fontSize="large" />
                                            <Typography
                                                variant="body1"
                                                sx={{ textTransform: "none" }}
                                            >
                                                {iconFile
                                                    ? iconFile.name
                                                    : "クリックして画像を選択 または ファイルをドロップ"}
                                            </Typography>
                                        </Box>
                                        {iconFileError ? (
                                            <Alert
                                                variant="outlined"
                                                severity="error"
                                                sx={{ mt: 1 }}
                                            >
                                                {iconFileError}
                                            </Alert>
                                        ) : null}
                                    </Box>
                                </Stack>
                            </Box>
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    ゲーム説明{" "}
                                    <Typography component="span" color="error">
                                        *
                                    </Typography>
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    placeholder="ゲームの内容、遊び方などの説明と、使用素材のクレジットを記入してください"
                                    value={description}
                                    onChange={handleInputDescription}
                                />
                                {descriptionError ? (
                                    <Alert
                                        variant="outlined"
                                        severity="error"
                                        sx={{ mt: 1 }}
                                    >
                                        {descriptionError}
                                    </Alert>
                                ) : null}
                            </Box>
                            <GameTermsAndConditions />
                            <Box>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    color={
                                        gameId == null &&
                                        (!title ||
                                            !gameFile ||
                                            !iconFile ||
                                            !description)
                                            ? "inherit"
                                            : "primary"
                                    }
                                    loading={sending}
                                    disabled={sending}
                                >
                                    ゲームを{gameId == null ? "投稿" : "更新"}
                                </Button>
                            </Box>
                            {serverError ? (
                                <Alert
                                    variant="outlined"
                                    severity="error"
                                    sx={{ mt: 1 }}
                                >
                                    {serverError}
                                </Alert>
                            ) : null}
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
