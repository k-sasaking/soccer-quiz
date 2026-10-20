import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "サッカークイズ",
  description: "soccer_knowledge.md から作ったサッカークイズ。1問ずつ出題します。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
