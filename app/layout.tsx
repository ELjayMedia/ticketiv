import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { PermissionsProvider } from "@/lib/providers/permissions-provider"
import { RootLayoutClient } from "@/components/root-layout-client"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Ticketiv",
    template: "%s · Ticketiv",
  },
  description: "Buy, sell, and share event tickets across Southern Africa.",
  applicationName: "Ticketiv",
  appleWebApp: { title: "Ticketiv", capable: true, statusBarStyle: "default" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f4ec",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Fraunces (variable, optical size + SOFT axes) + DM Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <PermissionsProvider>
          <RootLayoutClient>
            {children}
            <Analytics />
          </RootLayoutClient>
        </PermissionsProvider>
      </body>
    </html>
  )
}
