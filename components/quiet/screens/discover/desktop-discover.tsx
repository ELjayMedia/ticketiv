"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { RecentlyViewedSection } from "@/components/quiet/screens/discover/recently-viewed-section";
import { SuggestedEventsRow } from "@/components/quiet/screens/discover/suggested-events-row";
import { DiscoverFilterChips } from "@/components/quiet/screens/discover/discover-filter-chips";
import { LoadMoreSection } from "@/components/quiet/screens/discover/load-more-section";
import { FeaturedHero } from "@/components/quiet/screens/discover/featured-hero";
import { AnnouncementBar } from "@/components/quiet/screens/discover/announcement-bar";
import { PHOTOS } from "@/lib/photos";
import type { DiscoverSection } from "@/lib/data/public/discover-feed";
import type { DiscoverEvent } from "@/lib/mappers/discover";

/* ──────────────────────────────────────────────────────────────
 * Desktop Discover · "/" on tablet+. Mirrors MobileDiscover.
 * ────────────────────────────────────────────────────────────── */

interface DesktopDiscoverProps {
  /** Not ended, starting within 7 days (includes tonight and events already under way). */
  thisWeek?: DiscoverSection;
  /** Every published event starting after this week. */
  upcoming?: DiscoverSection;
  editorPick?: DiscoverEvent | null;
  /** Hero carousel slides (pickFeatured); falls back to the editor's pick. */
  featured?: ReadonlyArray<DiscoverEvent>;
}

const CATEGORIES = [
  { icon: "music", label: "Music", href: "/search?category=Music" },
  { icon: "fire", label: "Comedy", href: "/search?category=Comedy" },
  { icon: "users", label: "Workshops", href: "/search?category=Workshop" },
  { icon: "ticket", label: "Theatre", href: "/search?category=Theatre" },
  { icon: "spark", label: "Festivals", href: "/search?category=Festival" },
] as const;

interface GridRow {
  href: string;
  photo: string;
  title: string;
  when: string;
  venue: string;
  price: string;
  chip?: string;
  trustLabel: string | null;
  stockLabel: string | null;
  stockType: "sold-out" | "low" | null;
  verified: boolean;
}

function toGrid(ev: DiscoverEvent): GridRow {
  return {
    href: ev.href,
    photo: ev.photo || PHOTOS.dj_neon,
    title: ev.title,
    when: ev.whenLabel,
    venue: ev.venue,
    price: ev.priceLabel,
    chip: ev.city ?? undefined,
    trustLabel: ev.soldLabel,
    stockLabel: ev.stockLabel,
    stockType: ev.stockType,
    verified: ev.organizerVerified,
  };
}

export function DesktopDiscover({
  thisWeek = { events: [], hasMore: false },
  upcoming = { events: [], hasMore: false },
  editorPick,
  featured,
}: DesktopDiscoverProps = {}) {
  const slides = featured?.length ? featured : editorPick ? [editorPick] : [];
  return (
    <div className="mx-auto max-w-[1280px] px-10 py-6">
      <AnnouncementBar>
        Ticketiv is Southern Africa&apos;s home for live events — buy in minutes, no account needed.
      </AnnouncementBar>

      <FeaturedHero events={slides} />

      {/* Page header */}
      <div className="flex items-end justify-between pb-4">
        <div>
          <div className="text-label">Discover</div>
          <h1 className="mt-1 text-[32px] font-semibold leading-none tracking-[-0.025em]">What&apos;s on</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-bg"
          >
            <Icon name="filter" size={14} /> Filters
          </Link>
        </div>
      </div>

      {/* Quick-filter chips */}
      <div className="mb-6">
        <Suspense>
          <DiscoverFilterChips />
        </Suspense>
      </div>

      <RecentlyViewedSection variant="desktop" />

      <SuggestedEventsRow variant="desktop" />

      {/* Two-column: categories + grid */}
      <div className="grid grid-cols-[200px_1fr] gap-8">
        {/* Left: categories */}
        <aside className="sticky top-6 self-start">
          <div className="text-label mb-3">Browse by</div>
          <ul className="flex flex-col">
            {CATEGORIES.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[13px] hover:bg-bg"
                >
                  <Icon name={c.icon} size={16} className="text-ink-3" />
                  <span className="flex-1 text-left">{c.label}</span>
                  <Icon name="chevR" size={12} className="text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
          <Divider className="my-4" />
          <div className="text-label mb-3">Price</div>
          <div className="flex flex-col gap-1 text-[13px]">
            <Link href="/search?onlyFree=1" className="rounded-md px-2 py-1.5 hover:bg-bg">
              Free
            </Link>
            <Link href="/search?maxPriceCents=50000" className="rounded-md px-2 py-1.5 hover:bg-bg">
              Under E500
            </Link>
            <Link href="/search?maxPriceCents=150000" className="rounded-md px-2 py-1.5 hover:bg-bg">
              E500 – E1,500
            </Link>
            <Link href="/search" className="rounded-md px-2 py-1.5 hover:bg-bg">
              E1,500+
            </Link>
          </div>
        </aside>

        {/* Right: this week + upcoming */}
        <div className="flex flex-col gap-10">
          <DesktopEventGridSection
            title="This week"
            subtitle="Happening in the next 7 days"
            section={thisWeek}
            when="thisWeek"
            emptyText="No events in the next 7 days. See what's coming up below."
          />
          <DesktopEventGridSection
            title="Upcoming"
            subtitle="All events after this week"
            section={upcoming}
            when="upcoming"
            emptyText="No other upcoming events yet."
          />
        </div>
      </div>
    </div>
  );
}

function DesktopEventGridSection({
  title,
  subtitle,
  section,
  when,
  emptyText,
}: {
  title: string;
  subtitle: string;
  section: DiscoverSection;
  when: "thisWeek" | "upcoming";
  emptyText: string;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-h2">{title}</h2>
        <p className="mt-0.5 font-mono text-[11px] uppercase text-ink-3">{subtitle}</p>
      </div>
      {section.events.length === 0 ? (
        <Card flat className="border-dashed p-6 text-center text-[13px] text-ink-3">{emptyText}</Card>
      ) : (
        <LoadMoreSection
          initialEvents={section.events}
          // LoadMoreSection only needs to know whether more exist; the API reports exact hasMore.
          totalCount={section.events.length + (section.hasMore ? 1 : 0)}
          batchSize={9}
          when={when}
          renderEvents={(evs) => (
              <div className="grid grid-cols-3 gap-4">
                {evs.map(toGrid).map((e) => (
                  <Link
                    key={e.href}
                    href={e.href}
                    className="group"
                  >
                    <Card className="overflow-hidden transition-shadow group-hover:shadow-[var(--shadow-elev)]">
                      <Photo src={e.photo} height={180} overlay={e.chip ? "dim" : "none"}>
                        {e.chip && (
                          <Chip
                            className="ml-auto border-transparent bg-white/95 text-ink"
                            size="sm"
                          >
                            {e.chip}
                          </Chip>
                        )}
                      </Photo>
                      <div className="p-3.5">
                        <div className="text-h3 flex items-center gap-1.5 truncate">
                          <span className="truncate">{e.title}</span>
                          {e.verified && <VerifiedMark size={14} title="Verified organizer" />}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                          <Icon name="cal" size={12} />
                          <span className="truncate">{e.when}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                          <Icon name="pin" size={12} />
                          <span className="truncate">{e.venue}</span>
                        </div>
                        <Divider className="my-2.5" />
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[14px] font-semibold">
                            {e.price}
                          </span>
                          {e.stockLabel ? (
                            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${e.stockType === "sold-out" ? "bg-danger-soft text-danger" : "bg-warning/10 text-warning"}`}>{e.stockLabel}</span>
                          ) : e.trustLabel ? (
                            <span className="font-mono text-[11px] text-ink-3">
                              {e.trustLabel}
                            </span>
                          ) : (
                            <span className="text-[12px] text-accent group-hover:underline">
                              Details →
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
          )}
        />
      )}
    </section>
  );
}

function VerifiedMark({ size = 14, title }: { size?: number; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title ?? "Verified organizer"}
      title={title ?? "Verified organizer"}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-white"
      style={{ width: size, height: size }}
    >
      <Icon name="check" size={Math.round(size * 0.7)} strokeWidth={3} />
    </span>
  );
}
