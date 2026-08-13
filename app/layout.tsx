import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/inter-tight/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";
import { DeploymentEnvironmentBanner } from "@/components/deployment-environment-banner";
import { SearchOverlayProvider } from "@/components/quiet/search/search-overlay";

export const metadata: Metadata = {
  metadataBase: new URL("https://ticketiv.app"),
  title: {
    default: "Ticketiv — Discover what's on",
    template: "%s · Ticketiv",
  },
  description:
    "Discover, book and manage tickets for events across Southern Africa.",
  applicationName: "Ticketiv",
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
};

export const viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-ink antialiased">
        <DeploymentEnvironmentBanner />
        <SearchOverlayProvider>{children}</SearchOverlayProvider>
        <Analytics />
      </body>
    </html>
  );
}
