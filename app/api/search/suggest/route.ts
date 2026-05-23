import { NextResponse, type NextRequest } from "next/server";
import { searchEvents } from "@/lib/data/public/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight typeahead for the global search overlay. Returns up to 6 ranked
 * events for the given query — enough to fill the dropdown without flooding
 * the screen. The overlay debounces calls so this stays cheap.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ query: q ?? "", events: [] });
  }

  const results = await searchEvents({ q, limit: 6 });

  const events = results.rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    cover: r.cover_image_url,
    when: r.starts_at,
    venue: r.venue_name,
    city: r.city,
    category: r.category,
    minPriceCents: r.min_price_cents,
    currency: r.currency,
  }));

  return NextResponse.json({ query: q, events });
}
