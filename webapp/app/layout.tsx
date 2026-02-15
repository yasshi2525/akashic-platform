import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Geist, Geist_Mono } from "next/font/google";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { getAuth } from "@/lib/server/auth";
import {
    publicContentBaseUrl,
    publicPlaylogServerUrl,
} from "@/lib/server/akashic";
import { getShutdownState } from "@/lib/server/shutdown-state";
import {
    customFooterLabel,
    customFooterImagePath,
    customFooterImageWidth,
} from "@/lib/server/custom-footer";
import { theme } from "@/lib/client/theme";
import { AkashicProvider } from "@/components/akashic-provider";
import { AuthProvider } from "@/components/auth-provider";
import { CustomFooterProvider } from "@/components/custom-footer-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ToastMessage } from "@/components/toast-message";
import { ShutdownBanner } from "@/components/shutdown-banner";

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

export default async function RootLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    const user = await getAuth();
    const shutdownState = getShutdownState();
    return (
        <html
            lang="ja"
            className={`${geistSans.className} ${geistMono.className} antialiased`}
        >
            <body>
                <AppRouterCacheProvider>
                    <AkashicProvider
                        playlogServerUrl={publicPlaylogServerUrl}
                        publicContentBaseUrl={publicContentBaseUrl}
                    >
                        <CustomFooterProvider
                            customFooterLabel={customFooterLabel}
                            customFooterImagePath={customFooterImagePath}
                            customFooterImageWidth={customFooterImageWidth}
                        >
                            <AuthProvider user={user}>
                                <ThemeProvider theme={theme}>
                                    <CssBaseline />
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            minHeight: "100vh",
                                            overflowY: "auto",
                                        }}
                                    >
                                        <SiteHeader />
                                        <ShutdownBanner
                                            initialState={shutdownState}
                                        />
                                        <Box
                                            component="main"
                                            sx={{ flexGrow: 1 }}
                                        >
                                            {children}
                                        </Box>
                                        <SiteFooter />
                                        <ToastMessage />
                                    </Box>
                                </ThemeProvider>
                            </AuthProvider>
                        </CustomFooterProvider>
                    </AkashicProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
