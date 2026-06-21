"use client";

import { useParams } from "next/navigation";
import { LiveContainer } from "@/components/live-container";

export default function LivePage() {
    const { handle } = useParams<{ handle: string }>();

    return <LiveContainer handle={handle} />;
}
