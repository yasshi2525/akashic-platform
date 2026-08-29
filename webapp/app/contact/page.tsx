import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
    title: "お問い合わせ",
};

export default function ContactPage() {
    return <ContactForm />;
}
