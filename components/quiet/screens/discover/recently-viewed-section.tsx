"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";
import { getRecentlyViewed, type RecentlyViewedEvent } from "@/lib/recently-viewed";

/**
 * Client-only "Recently viewed" row for the discovery home (TICK-212).
 *
 * Reads the localStorage store after hydration; renders nothing (no empty
 * heading) on the server, before mount, or when the list is empty — so there is
 * no hydration mismatch and no orphaned section when the buyer is new.
 *
 * `variant` matches the surrounding discover layout: horizontally-scrollable
 * cards styled like the "Tonight" rail (mobile) or the grid cards (desktop).
 */
export function RecentlyViewedSection({ variant }: { variant: "mobile" | "desktop" }) {
  const [items, setItems] = useState<RecentlyViewedEvent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(getRecentlyViewed());
    setMounted(true);
  }, []);

  if (!mounted || items.length === 0) return null;

  return variant === "mobile" ? (
    <section className="pb-6">
      <div className="flex items-end justify-between px-5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-h2 text-[18px]">Recently viewed</h3>
            <Icon name="clock" size={14} className="text-ink-3" />
          </div>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            Events you looked at lately
          </p>
        </div>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
        {items.map((e) => (
          <Link key={e.slug} href={`/events/${e.slug}`} className="block w-[200px] shrink-0">
            <Card className="overflow-hidden">
              <Photo src={e.photo || PHOTOS.dj_neon} height={120} />
              <div className="p-3">
                <div className="text-h3 truncate">{e.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name="cal" size={12} />
                  <span className="truncate">{e.dateShort}</span>
                </div>
                {e.priceLabel && (
                  <div className="mt-2 font-mono text-[13px] font-semibold tabular-nums">
                    {e.priceLabel}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  ) : (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-h2">Recently viewed</h2>
        <Icon name="clock" size={16} className="text-ink-3" />
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
        {items.map((e) => (
          <Link key={e.slug} href={`/events/${e.slug}`} className="group block w-[240px] shrink-0">
            <Card className="overflow-hidden transition-shadow group-hover:shadow-[var(--shadow-elev)]">
              <Photo src={e.photo || PHOTOS.dj_neon} height={150} />
              <div className="p-3.5">
                <div className="text-h3 truncate">{e.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name="cal" size={12} />
                  <span className="truncate">{e.dateShort}</span>
                </div>
                {e.priceLabel && (
                  <div className="mt-2 font-mono text-[14px] font-semibold tabular-nums">
                    {e.priceLabel}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
