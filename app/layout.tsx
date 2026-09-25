import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://orders-operations-prototype.opal-smile-7711.chatgpt.site",
  ),
  title: "Orders Operations Prototype",
  description:
    "Working store-operations pilot for picking, staging, pickup check-in, notifications and delivery sign-off.",
  applicationName: "Orders Operations",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Orders Operations",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Orders Operations Prototype",
    description: "Pick, stage, check in, hand off and coordinate delivery",
    images: [
      {
        url: "https://orders-operations-prototype.opal-smile-7711.chatgpt.site/og.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orders Operations Prototype",
    description: "Pick, stage, check in, hand off and coordinate delivery",
    images: [
      "https://orders-operations-prototype.opal-smile-7711.chatgpt.site/og.png",
    ],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#062f64",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
