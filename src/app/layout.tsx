import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAVA",
  description: "預約你的美甲美睫設計師",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
