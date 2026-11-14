import type { Metadata } from "next";
import "@fontsource-variable/inter-tight/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";
import { DeploymentEnvironmentBanner } from "@/components/deployment-environment-banner";
import { SearchOverlayProvider } from "@/components/quiet/search/search-overlay";
import { ToastProvider } from "@/components/quiet/ui/toast";
import { TICKETIV_ICONS } from "@/lib/brand/icons";

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
  // The Ticketiv app mark, same as the Android app (scripts/brand/render-brand-assets.mjs).
  icons: TICKETIV_ICONS,
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
