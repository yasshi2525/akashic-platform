import type { Metadata } from "next";
import { MuteSettings } from "@/components/mute-settings";

export const metadata: Metadata = {
    title: "ミュートの設定",
};

export default function ModerationSettingsPage() {
    return <MuteSettings />;
}
