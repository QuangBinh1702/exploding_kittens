import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meono.online"),
  title: "Mèo Nổ Online - Exploding Kittens Việt Nam",
  description: "Chơi game Mèo Nổ (Exploding Kittens) trực tuyến cùng bạn bè hoàn toàn miễn phí. Trải nghiệm đồ họa cyberpunk mượt mà, đầy đủ các bản mở rộng tiếng Việt.",
  keywords: ["mèo nổ online", "exploding kittens online", "chơi mèo nổ", "mèo nổ tiếng việt", "board game online"],
  authors: [{ name: "Exploding Kittens VN Team" }],
  openGraph: {
    title: "Mèo Nổ Online - Exploding Kittens Việt Nam",
    description: "Chơi game Mèo Nổ trực tuyến hoàn toàn miễn phí cùng bạn bè. Trải nghiệm giao diện cyberpunk sống động, tiếng Việt chuẩn xác.",
    url: "https://meono.online",
    siteName: "Mèo Nổ Online",
    images: [
      {
        url: "/assets/logo.png",
        width: 512,
        height: 512,
        alt: "Mèo Nổ Logo",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Mèo Nổ Online - Exploding Kittens Việt Nam",
    description: "Chơi Mèo Nổ trực tuyến miễn phí cùng bạn bè.",
    images: ["/assets/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
