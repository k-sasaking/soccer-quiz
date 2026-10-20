import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "サッカークイズ",
  description: "soccer_knowledge.md の内容から作ったサッカークイズ（全10問）",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// 黒基調で統一するため、常にダークテーマで表示する
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-dvh bg-background text-lg text-foreground antialiased">
        <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
