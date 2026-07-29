import type { MetadataRoute } from "next";

const SITE_URL = "https://ticketiv.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/checkout",
        "/friends",
        "/login",
        "/me",
        "/notifications",
        "/onboarding",
        "/orgs",
        "/scan",
        "/signup",
        "/tickets",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
