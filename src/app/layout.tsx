import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAVA",
  description: "預約你的美甲美睫設計師",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/kbx7nkx.css" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
