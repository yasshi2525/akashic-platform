import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Geist, Geist_Mono } from "next/font/google";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@/lib/client/theme";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "みんなでゲーム! 自作ゲーム投稿・プレイサイト",
    description:
        "みんなで遊べるゲームをみんなで遊ぼう。自作ゲームを投稿して遊べるサイトです。",
};

export default function RootLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    return (
        <html
            lang="ja"
            className={`${geistSans.className} ${geistMono.className} antialiased`}
        >
            <body>
                <AppRouterCacheProvider>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                minHeight: "100vh",
                            }}
                        >
                            <SiteHeader />
                            <Box component="main" sx={{ flexGrow: 1 }}>
                                {children}
                            </Box>
                            <SiteFooter />
                        </Box>
                    </ThemeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
