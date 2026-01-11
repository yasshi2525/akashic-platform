"use client";

import { ChangeEvent, useState } from "react";
import {
    Alert,
    Box,
    Checkbox,
    Container,
    FormControlLabel,
    List,
    ListItem,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";

function TACBody() {
    const theme = useTheme();
    return (
        <Stack
            spacing={1}
            maxWidth="md"
            maxHeight="25em"
            alignSelf="center"
            sx={{
                py: 2,
                px: 4,
                borderColor: theme.palette.divider,
                borderStyle: "solid",
                borderWidth: 1,
                borderRadius: 4,
                overflow: "auto",
            }}
        >
            <Typography variant="h5" component="h2" textAlign="center">
                投稿規約
            </Typography>
            <Typography variant="h6" component="h3">
                1. 総則
            </Typography>
            <Typography variant="body1" gutterBottom>
                本投稿規約（以下「本規約」といいます）は、本サイトにおいて利用者がゲーム作品その他のコンテンツを投稿する際の条件を定めるものです。
            </Typography>
            <Typography variant="h6" component="h3">
                2. 投稿できるコンテンツ
            </Typography>
            <Typography variant="body1" gutterBottom>
                利用者は、自らが制作したゲーム作品または正当な権利を有するゲーム作品のみを投稿することができます。
            </Typography>
            <Typography variant="h6" component="h3">
                3. 権利の帰属
            </Typography>
            <Typography variant="body1" gutterBottom>
                投稿されたゲーム作品に関する著作権は、当該作品を制作した利用者に帰属します。
                ただし、利用者は、本サイトの運営、宣伝、機能提供に必要な範囲において、当該作品を無償で利用（複製、公開、配信、翻訳、表示等）する非独占的な権利を本サイト運営者に許諾するものとします。
            </Typography>
            <Typography variant="h6" component="h3">
                4. 第三者の権利・ライセンス遵守
            </Typography>
            <Typography variant="body1" gutterBottom>
                利用者は、投稿するゲーム作品において使用する素材（プログラム、画像、音声、フォント等）について、第三者の著作権その他の権利を侵害していないこと、または正当なライセンスに基づき利用していることを保証するものとします。
                オープンソースソフトウェア、フリー素材等、クレジット表示やライセンス表記が求められる素材を使用する場合、利用者は、当該ライセンス条件を遵守し、作品の説明欄等に適切なクレジットおよびライセンス情報を明記しなければなりません。
            </Typography>
            <Typography variant="h6" component="h3">
                5. 禁止事項
            </Typography>
            <Box>
                <Typography variant="body1">
                    利用者は、以下の行為を行ってはなりません。
                </Typography>
                <List dense sx={{ listStyleType: "disc", pl: 4 }}>
                    <ListItem sx={{ display: "list-item" }}>
                        第三者の著作権、商標権、肖像権その他の権利を侵害する行為
                    </ListItem>
                    <ListItem sx={{ display: "list-item" }}>
                        法令または公序良俗に反する内容を含む作品の投稿
                    </ListItem>
                    <ListItem sx={{ display: "list-item" }}>
                        虚偽または誤解を招くライセンス表示
                    </ListItem>
                    <ListItem sx={{ display: "list-item" }}>
                        本サイトの運営を妨害する行為
                    </ListItem>
                </List>
            </Box>
            <Typography variant="h6" component="h3">
                6. 実況動画・配信の取り扱い
            </Typography>
            <Box>
                <Typography variant="body1">
                    本サイトを通じて公開されているゲーム作品について、第三者が実況動画の投稿、ライブ配信等を行うことを、原則として許可します。
                    ただし、実況・配信は、本サイトの画面を通じてプレイされた内容に限るものとし、以下の場合を除きます。
                </Typography>
                <List dense sx={{ listStyleType: "disc", pl: 4 }}>
                    <ListItem sx={{ display: "list-item" }}>
                        投稿者が、作品の説明欄等において実況・配信を禁止または条件付きで許可している場合
                    </ListItem>
                    <ListItem sx={{ display: "list-item" }}>
                        法令または公序良俗に反する態様で行われる場合
                    </ListItem>
                </List>
            </Box>
            <Typography variant="h6" component="h3">
                7. 免責事項
            </Typography>
            <Typography variant="body1" gutterBottom>
                本サイトは、投稿されたゲーム作品の内容、品質、正確性について一切の責任を負いません。
                投稿された作品に起因して第三者との間に生じた紛争については、当該投稿を行った利用者が自己の責任と費用において解決するものとします。
            </Typography>
            <Typography variant="h6" component="h3">
                8. 削除・非公開
            </Typography>
            <Typography variant="body1" gutterBottom>
                本サイトは、投稿された作品が本規約に違反すると判断した場合、事前の通知なく当該作品を削除または非公開とすることができます。
            </Typography>
            <Typography variant="h6" component="h3">
                9. 本サイトの中断、停止
            </Typography>
            <Typography variant="body1" gutterBottom>
                本サイト運営者は、事前の予告なく任意の理由で本サイトの提供を中断・停止する場合があります。
                本サイト運営者は、利用者が本サイトを利用できなかったことによって利用者に生じた損害について、一切の責任を負いません。
            </Typography>
            <Typography variant="h6" component="h3">
                10. 規約の変更
            </Typography>
            <Typography variant="body1" gutterBottom>
                本規約は、必要に応じて変更されることがあります。変更後の規約は、本サイト上に表示した時点で効力を生じるものとします。
            </Typography>
            <Typography variant="body2">2026年1月11日 制定</Typography>
        </Stack>
    );
}

export function GameTermsAndConditions() {
    const [agreed, setAgreed] = useState(false);

    function handleCheck(ev: ChangeEvent<HTMLInputElement>) {
        setAgreed(ev.target.checked);
    }

    return (
        <Container>
            <Stack>
                <TACBody />
                <FormControlLabel
                    required
                    control={
                        <Checkbox checked={agreed} onChange={handleCheck} />
                    }
                    label="投稿規約に同意する"
                    sx={{ mt: 2, alignSelf: "center" }}
                />
                {!agreed ? (
                    <Box maxWidth="md" alignSelf="center" textAlign="center">
                        <Typography color="error" variant="body2" gutterBottom>
                            投稿規約に同意してください。
                        </Typography>
                        <Alert variant="outlined" severity="info">
                            ニコニコ関連サービスでのみ利用可能な素材を使用していないか確認してください
                        </Alert>
                    </Box>
                ) : null}
            </Stack>
        </Container>
    );
}
