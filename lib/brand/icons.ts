import type { Metadata } from "next"

/**
 * Browser and home-screen icons for organiser pages: the Ticketiv Organizer
 * app mark (scripts/brand/render-brand-assets.mjs). The attendee site keeps the
 * Ticketiv icons set in app/layout.tsx.
 */
export const ORGANIZER_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: "/organizer/favicon.ico", sizes: "16x16 32x32 48x48" },
    { url: "/organizer/icon-192.png", type: "image/png", sizes: "192x192" },
    { url: "/organizer/icon-512.png", type: "image/png", sizes: "512x512" },
  ],
  apple: "/organizer/apple-icon.png",
  shortcut: "/organizer/favicon.ico",
}
