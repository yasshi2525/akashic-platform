import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@mui/material";
import { theme } from "@/theme";
import { SiteHeader } from "@/site-header";

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
                        <SiteHeader />
                        {children}
                    </ThemeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
