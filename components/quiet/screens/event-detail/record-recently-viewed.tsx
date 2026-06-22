"use client";

import { useEffect } from "react";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

interface RecordRecentlyViewedProps {
  slug: string;
  title: string;
  photo: string;
  dateShort: string;
  priceLabel: string | null;
}

/**
 * Invisible client child mounted on the event detail page. On mount it writes a
 * compact snapshot of the event into the localStorage recently-viewed store so
 * the discovery home can surface it later (TICK-212). Renders nothing.
 */
export function RecordRecentlyViewed({
  slug,
  title,
  photo,
  dateShort,
  priceLabel,
}: RecordRecentlyViewedProps) {
  useEffect(() => {
    recordRecentlyViewed({ slug, title, photo, dateShort, priceLabel });
  }, [slug, title, photo, dateShort, priceLabel]);

  return null;
}
