"use client";

import { Box, Container, List, ListItem, Stack, Typography } from "@mui/material";

export default function TermsPage() {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack
                spacing={1}
                sx={{
                    py: 3,
                    px: { xs: 2, sm: 4 },
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 4,
                    bgcolor: "background.paper",
                }}
            >
                <Typography variant="h4" component="h1" textAlign="center">
                    利用規約
                </Typography>
                <Typography variant="body1" gutterBottom>
                    本利用規約（以下「本規約」といいます）は、みんなでゲーム!（以下「本サービス」といいます）の利用条件を定めるものです。
                </Typography>
                <Typography variant="h6" component="h2">
                    1. 適用
                </Typography>
                <Typography variant="body1" gutterBottom>
                    本規約は、利用者と本サービス運営者との間の本サービス利用に関わる一切の関係に適用されます。
                </Typography>
                <Typography variant="h6" component="h2">
                    2. アカウント
                </Typography>
                <Typography variant="body1" gutterBottom>
                    利用者は、正確かつ最新の情報を登録し、自己の責任でアカウントを管理するものとします。
                </Typography>
                <Typography variant="h6" component="h2">
                    3. 禁止事項
                </Typography>
                <Box>
                    <Typography variant="body1">
                        利用者は、以下の行為を行ってはなりません。
                    </Typography>
                    <List dense sx={{ listStyleType: "disc", pl: 4 }}>
                        <ListItem sx={{ display: "list-item" }}>
                            法令または公序良俗に反する行為
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            第三者の権利を侵害する行為
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            本サービスの運営を妨害する行為
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            不正アクセス、またはこれを試みる行為
                        </ListItem>
                    </List>
                </Box>
                <Typography variant="h6" component="h2">
                    4. 投稿コンテンツ
                </Typography>
                <Typography variant="body1" gutterBottom>
                    利用者は、自らが権利を有するコンテンツのみを投稿できます。投稿コンテンツの権利は原則として利用者に帰属しますが、本サービスの運営に必要な範囲で無償利用する権利を運営者に許諾するものとします。
                </Typography>
                <Typography variant="h6" component="h2">
                    5. 免責事項
                </Typography>
                <Typography variant="body1" gutterBottom>
                    本サービスは、提供する情報や機能の完全性・正確性を保証しません。利用者に生じた損害について、運営者は一切の責任を負いません。
                </Typography>
                <Typography variant="h6" component="h2">
                    6. 規約の変更
                </Typography>
                <Typography variant="body1" gutterBottom>
                    運営者は、必要と判断した場合には、本規約を変更することができます。変更後の規約は本サービス上に表示した時点から効力を生じます。
                </Typography>
                <Typography variant="body2">2026年2月4日 制定</Typography>
            </Stack>
        </Container>
    );
}
