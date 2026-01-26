"use client";

import { useAuth } from "@/lib/client/useAuth";
import { PlayList } from "@/components/play-list";

export default function MyPlayListPage() {
    const [user] = useAuth();

    if (!user) {
        return null;
    }

    return (
        <PlayList
            title="自分が立てた部屋"
            description="自分が部屋主として作成したプレイ一覧"
            gameMasterId={user.id}
        />
    );
}
