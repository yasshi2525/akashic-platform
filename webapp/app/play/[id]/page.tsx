import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@yasshi2525/persist-schema";
import { publicBaseUrl } from "@/lib/server/akashic";
import { getShareImageUrl } from "@/lib/server/play-share";
import { PlayContainer } from "@/components/play-container";

const getShareData = cache(async (playId: number) => {
    return await prisma.play.findUnique({
        where: { id: playId },
        select: {
            id: true,
            name: true,
            content: {
                select: {
                    game: {
                        select: {
                            title: true,
                            description: true,
                        },
                    },
                },
            },
        },
    });
});

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ shareId?: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    if (id == null) {
        return {};
    }
    const playId = parseInt(id);
    const { shareId } = (await searchParams) ?? {};
    if (!shareId) {
        return {};
    }
    const shareData = await getShareData(playId);
    if (!shareData) {
        return {};
    }
    const title = `${shareData.content.game.title}をプレイ中`;
    const description = shareData.name
        ? `ただいまゲームプレイ中！一緒に遊ぼう！ ${shareData.name}`
        : "ただいまゲームプレイ中！一緒に遊ぼう！";
    const imageUrl = await getShareImageUrl(playId, shareId);
    const canonical = `/play/${playId}?shareId=${shareId}`;
    return {
        metadataBase: new URL(publicBaseUrl),
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            title,
            description,
            type: "website",
            url: canonical,
            images: [
                {
                    url: imageUrl,
                    width: 1280,
                    height: 720,
                    alt: `${shareData.content.game.title}のスクリーンショット`,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    };
}

export default function Play() {
    return <PlayContainer />;
}
