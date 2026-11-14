import type { MetadataRoute } from "next";

import { MANIFEST_ICONS } from "@/lib/brand/icons";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ticketiv",
    short_name: "Ticketiv",
    description:
      "Discover, book and manage tickets for events across Southern Africa.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [...MANIFEST_ICONS],
  };
}
