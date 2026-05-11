import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood on the Clocktower",
  description: "Table virtuelle pour Blood on the Clocktower",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#0c0a09",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clocktower",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-stone-950 text-stone-100 font-serif antialiased text-[15px] leading-relaxed">{children}</body>
    </html>
  );
}
