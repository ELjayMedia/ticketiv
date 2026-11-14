import type { Metadata } from "next"

/**
 * Browser and home-screen icons, rendered by scripts/brand/render-brand-assets.mjs.
 *
 * ICON_VERSION is appended to every icon URL. Browsers keep favicons far longer
 * than their cache headers say, so bump it whenever the marks are re-rendered
 * or returning visitors keep seeing the old icon.
 */
export const ICON_VERSION = "2026-11-13"

const v = (path: string) => `${path}?v=${ICON_VERSION}`

function iconSet(dir: "" | "/organizer", svg: string): NonNullable<Metadata["icons"]> {
  return {
    icon: [
      { url: v(`${dir}/favicon.ico`), sizes: "16x16 32x32 48x48" },
      { url: v(svg), type: "image/svg+xml", sizes: "any" },
      { url: v(`${dir}/icon-192.png`), type: "image/png", sizes: "192x192" },
      { url: v(`${dir}/icon-512.png`), type: "image/png", sizes: "512x512" },
    ],
    apple: { url: v(`${dir}/apple-icon.png`), sizes: "180x180" },
    shortcut: v(`${dir}/favicon.ico`),
  }
}

/** Attendee site: the violet Ticketiv mark (same as the Ticketiv Android app). */
export const TICKETIV_ICONS = iconSet("", "/brand/ticketiv-mark.svg")

/**
 * Organiser pages: the Ticketiv Organizer mark (black, with the entry check).
 * The attendee site keeps TICKETIV_ICONS, set in app/layout.tsx.
 */
export const ORGANIZER_ICONS = iconSet("/organizer", "/brand/organizer-mark.svg")

/** Icon entries for the web app manifest (app/manifest.ts). */
export const MANIFEST_ICONS = [
  { src: v("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: v("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  // The mark is a full-bleed square with the ticket inside the maskable safe zone.
  { src: v("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
] as const
