import type React from "react"
import type { Metadata, Viewport } from "next"

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
  themeColor: "#1f5947",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
