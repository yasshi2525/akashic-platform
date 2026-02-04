"use client";

import {
    Box,
    Container,
    List,
    ListItem,
    Stack,
    Typography,
} from "@mui/material";

export default function PrivacyPolicyPage() {
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
                    プライバシーポリシー
                </Typography>
                <Typography variant="body1" gutterBottom>
                    みんなでゲーム!（以下「本サービス」といいます）は、利用者の個人情報を適切に取り扱うため、以下のとおりプライバシーポリシーを定めます。
                </Typography>
                <Typography variant="h6" component="h2">
                    1. 取得する情報
                </Typography>
                <Box>
                    <Typography variant="body1">
                        本サービスは、以下の情報を取得する場合があります。
                    </Typography>
                    <List dense sx={{ listStyleType: "disc", pl: 4 }}>
                        <ListItem sx={{ display: "list-item" }}>
                            ユーザー識別子
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            表示名
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            プロフィール画像URL
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            投稿コンテンツおよび編集履歴
                        </ListItem>
                        <ListItem sx={{ display: "list-item" }}>
                            端末情報、アクセスログ、Cookie 等
                        </ListItem>
                    </List>
                    <Typography variant="body1">
                        OAuth認証の過程において、メールアドレスが提供される場合があります。
                    </Typography>
                </Box>
                <Typography variant="h6" component="h2">
                    2. 利用目的
                </Typography>
                <Typography variant="body1" gutterBottom>
                    取得した情報は、本人確認、サービス提供・改善、不正行為の防止、お問い合わせ対応のために利用します。
                </Typography>
                <Typography variant="h6" component="h2">
                    3. 表示・アクセス制限
                </Typography>
                <Typography variant="body1" gutterBottom>
                    本サービスにおいて、メールアドレスはサービス画面上に表示されることはありません。
                    また、メールアドレスを取得または参照するための公開APIは提供しておらず、本人を含む第三者が本サービスを通じて当該情報を取得することはできません。
                </Typography>
                <Typography variant="h6" component="h2">
                    4. 第三者提供
                </Typography>
                <Typography variant="body1" gutterBottom>
                    法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供しません。
                </Typography>
                <Typography variant="h6" component="h2">
                    5. 安全管理
                </Typography>
                <Typography variant="body1" gutterBottom>
                    個人情報の漏えい、滅失、毀損を防止するため、合理的な安全管理措置を講じます。
                </Typography>
                <Typography variant="h6" component="h2">
                    6. Cookie 等の利用
                </Typography>
                <Typography variant="body1" gutterBottom>
                    本サービスは、利便性向上や利用状況の分析のためにCookie等を利用する場合があります。
                </Typography>
                <Typography variant="h6" component="h2">
                    7. 本ポリシーの変更
                </Typography>
                <Typography variant="body1" gutterBottom>
                    本ポリシーは必要に応じて改定することがあります。改定後は本サービス上に表示した時点で効力を生じます。
                </Typography>
                <Typography variant="body2">2026年2月4日 制定</Typography>
            </Stack>
        </Container>
    );
}
