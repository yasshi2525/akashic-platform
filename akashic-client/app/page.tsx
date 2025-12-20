"use client";

import { useState } from "react";
import NewPlay from "./newPlay";
import Play from "./play";

export default function Home() {
    const [joined, setJoined] = useState<{
        contentId: string;
        playId: string;
    } | null>(null);

    if (joined) {
        return (
            <>
                <Play contentId={joined.contentId} playId={joined.playId} />
            </>
        );
    }

    return (
        <>
            <NewPlay contentId="1" handleNewPlay={setJoined} />
        </>
    );
}
