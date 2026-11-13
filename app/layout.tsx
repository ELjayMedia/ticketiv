import type { Metadata } from "next";
import "@fontsource-variable/inter-tight/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";
import { DeploymentEnvironmentBanner } from "@/components/deployment-environment-banner";
import { SearchOverlayProvider } from "@/components/quiet/search/search-overlay";
import { ToastProvider } from "@/components/quiet/ui/toast";

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
    // Same artwork as the Android app icon (apps/ticketiv/store-assets/play-icon-512.png).
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
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
        <ToastProvider>
          <SearchOverlayProvider>{children}</SearchOverlayProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
