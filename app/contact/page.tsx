import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "お問い合わせ | サッカークイズ",
  description: "サッカークイズへのご意見・ご質問はこちらから",
};

export default function ContactPage() {
  return <ContactForm contactEmail={process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ""} />;
}
