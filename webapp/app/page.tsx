"use client";

import { useAuth } from "@/lib/client/useAuth";
import { PlayList } from "@/components/play-list";
import { GuestLanding } from "@/components/landing";

export default function Home() {
    const [user] = useAuth();

    if (user == null || user.authType === "guest") {
        return <GuestLanding />;
    }

    return <PlayList />;
}
