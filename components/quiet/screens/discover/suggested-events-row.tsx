"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import type { DiscoverEvent } from "@/lib/mappers/discover";

/**
 * Client-only "You might also like" row for the discovery home (TICK-185).
 *
 * Reads the most-recently-viewed event's category from localStorage on mount,
 * then fetches up to 4 events from the same category via /api/discover/events.
 * Renders nothing until data is ready or if there is no category match.
 */
export function SuggestedEventsRow({ variant }: { variant: "mobile" | "desktop" }) {
  const [events, setEvents] = useState<DiscoverEvent[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const items = getRecentlyViewed();
    const mostRecent = items[0];
    const cat = mostRecent?.category ?? null;
    setCategory(cat);
    setMounted(true);

    if (!cat) return;

    const params = new URLSearchParams({ category: cat, limit: "4" });
    fetch(`/api/discover/events?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { events: DiscoverEvent[] } | null) => {
        if (!data) return;
        setEvents(data.events.slice(0, 4));
      })
      .catch(() => {/* fail silently */});
  }, []);

  if (!mounted || !category || events.length === 0) return null;

  return variant === "mobile" ? (
    <section className="pb-6">
      <div className="flex items-end justify-between px-5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-h2 text-[18px]">You might also like</h3>
            <Icon name="spark" size={14} className="text-accent" />
          </div>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            More {category} events
          </p>
        </div>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
        {events.map((e) => (
          <Link key={e.slug} href={e.href} className="block w-[200px] shrink-0">
            <Card className="overflow-hidden">
              <Photo src={e.photo || PHOTOS.dj_neon} height={120} />
              <div className="p-3">
                <div className="text-h3 truncate">{e.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name="cal" size={12} />
                  <span className="truncate">{e.dateShort}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-semibold">{e.priceLabel}</span>
                  {e.stockLabel && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        e.stockType === "sold-out" ? "bg-danger-soft text-danger" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {e.stockLabel}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  ) : (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-h2">You might also like</h2>
        <Icon name="spark" size={16} className="text-accent" />
        <span className="font-mono text-[11px] text-ink-3 uppercase tracking-wider">
          More {category}
        </span>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
        {events.map((e) => (
          <Link key={e.slug} href={e.href} className="group block w-[240px] shrink-0">
            <Card className="overflow-hidden transition-shadow group-hover:shadow-[var(--shadow-elev)]">
              <Photo src={e.photo || PHOTOS.dj_neon} height={150} />
              <div className="p-3.5">
                <div className="text-h3 truncate">{e.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name="cal" size={12} />
                  <span className="truncate">{e.dateShort}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name="pin" size={12} />
                  <span className="truncate">{e.venue}</span>
                </div>
                <Divider className="my-2.5" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[14px] font-semibold">{e.priceLabel}</span>
                  {e.stockLabel ? (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        e.stockType === "sold-out" ? "bg-danger-soft text-danger" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {e.stockLabel}
                    </span>
                  ) : (
                    <span className="text-[12px] text-accent group-hover:underline">Details →</span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
