import type { Metadata } from "next";
import { ModerationSettings } from "@/components/moderation-settings";

export const metadata: Metadata = {
    title: "モデレーション設定",
};

export default function ModerationSettingsPage() {
    return <ModerationSettings />;
}
