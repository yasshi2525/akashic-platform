"use client";

import { useAuth } from "@/lib/client/useAuth";
import { PlayList } from "@/components/play-list";

export default function Home() {
    const [user] = useAuth();

    return <PlayList isGuest={user?.authType !== "oauth"} />;
}
