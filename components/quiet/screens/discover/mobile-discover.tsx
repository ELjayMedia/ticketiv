"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { SearchTrigger } from "@/components/quiet/search/search-overlay";
import { RecentlyViewedSection } from "@/components/quiet/screens/discover/recently-viewed-section";
import { SuggestedEventsRow } from "@/components/quiet/screens/discover/suggested-events-row";
import { DiscoverFilterChips } from "@/components/quiet/screens/discover/discover-filter-chips";
import { LoadMoreSection } from "@/components/quiet/screens/discover/load-more-section";
import { PHOTOS } from "@/lib/photos";
import type { DiscoverSection } from "@/lib/data/public/discover-feed";
import type { DiscoverEvent } from "@/lib/mappers/discover";

interface MobileDiscoverProps {
  /** Not ended, starting within 7 days (includes tonight and events already under way). */
  thisWeek?: DiscoverSection;
  /** Every published event starting after this week. */
  upcoming?: DiscoverSection;
  editorPick?: DiscoverEvent | null;
}

interface WeekRow {
  href: string;
  photo: string;
  title: string;
  sub: string;
  date: string;
  venue: string;
  price: string;
  trustLabel: string | null;
  stockLabel: string | null;
  stockType: "sold-out" | "low" | null;
  verified: boolean;
}

interface EditorPickRow {
  href: string;
  photo: string;
  title: string;
  dateLabel: string;
  venue: string;
  priceLabel: string;
  topChip: string;
  bottomChip: string;
  trustLabel: string | null;
  verified: boolean;
}

function toWeek(ev: DiscoverEvent): WeekRow {
  return {
    href: ev.href,
    photo: ev.photo || PHOTOS.singer_red,
    title: ev.title,
    sub: ev.category ?? "Live event",
    date: ev.dateShort,
    venue: ev.venue,
    price: ev.priceLabel,
    trustLabel: ev.soldLabel,
    stockLabel: ev.stockLabel,
    stockType: ev.stockType,
    verified: ev.organizerVerified,
  };
}

function toEditorPick(ev: DiscoverEvent): EditorPickRow {
  return {
    href: ev.href,
    photo: ev.photo || PHOTOS.crowd_smoke,
    title: ev.title,
    dateLabel: ev.dateShort,
    venue: ev.venue,
    priceLabel: ev.priceLabel.replace(/^From\s+/, ""),
    topChip: ev.category ?? "Featured",
    bottomChip: ev.city ?? "Live event",
    trustLabel: ev.soldLabel,
    verified: ev.organizerVerified,
  };
}

export function MobileDiscover({
  thisWeek = { events: [], hasMore: false },
  upcoming = { events: [], hasMore: false },
  editorPick: editorPickProp,
}: MobileDiscoverProps = {}) {
  const HERO = editorPickProp ? toEditorPick(editorPickProp) : null;

  return (
    <div className="flex flex-col">
      <div className="h-14" />

      <header className="flex items-center gap-2 px-5 pb-4 pt-2">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">T</span>
          <span className="text-[17px] font-semibold tracking-tight">ticketiv</span>
        </Link>
        <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">BETA</span>
        <span className="flex-1" />
        <SearchTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Search">
          <Icon name="search" size={20} />
        </SearchTrigger>
        <Link href="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Notifications">
          <Icon name="bell" size={20} />
        </Link>
      </header>

      <div className="px-5 pb-3.5">
        <div className="text-label">Discover</div>
        <h1 className="text-h1 mt-0.5">What&apos;s on</h1>
      </div>

      <div className="px-5 pb-4">
        <Suspense>
          <DiscoverFilterChips />
        </Suspense>
      </div>

      <RecentlyViewedSection variant="mobile" />

      {HERO ? (
        <section className="px-5 pb-6">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"><Icon name="spark" size={12} /> Editor&apos;s pick</span>
          </div>
          <Card className="overflow-hidden">
            <Photo src={HERO.photo} height={220} overlay="dim">
              <div className="mt-auto flex gap-2">
                <Chip className="border-transparent bg-white/95 text-ink" size="sm">{HERO.topChip}</Chip>
                <Chip className="border-white/30 bg-white/15 text-white" size="sm">{HERO.bottomChip}</Chip>
              </div>
            </Photo>
            <div className="p-4">
              <h2 className="text-h2 inline-flex items-center gap-1.5">{HERO.title}{HERO.verified && <VerifiedMark size={14} title="Verified organizer" />}</h2>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-3">
                <span className="inline-flex items-center gap-1"><Icon name="cal" size={14} /> {HERO.dateLabel}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Icon name="pin" size={14} /> {HERO.venue}</span>
                {HERO.trustLabel && <><span>·</span><span className="font-mono text-[11px]">{HERO.trustLabel}</span></>}
              </div>
              <Divider className="my-3.5" />
              <div className="flex items-center">
                <div className="flex flex-1 flex-col"><div className="text-label">From</div><div className="mt-0.5 font-mono text-[18px] font-semibold">{HERO.priceLabel}</div></div>
                <Link href={HERO.href} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90">Get passes <Icon name="arrowR" size={14} /></Link>
              </div>
            </div>
          </Card>
        </section>
      ) : (
        <EmptySection title="No featured event yet" body="Featured events will appear here once published events are available." />
      )}

      <EventListSection
        title="This week"
        subtitle="HAPPENING IN THE NEXT 7 DAYS"
        section={thisWeek}
        when="thisWeek"
        emptyText="No events in the next 7 days. See what's coming up below."
      />

      <EventListSection
        title="Upcoming"
        subtitle="ALL EVENTS AFTER THIS WEEK"
        section={upcoming}
        when="upcoming"
        emptyText="No other upcoming events yet."
      />

      <SuggestedEventsRow variant="mobile" />
    </div>
  );
}

function EventListSection({
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
    <section className="px-5 pb-6">
      <div className="mb-3">
        <h3 className="text-h2 text-[18px]">{title}</h3>
        <p className="mt-0.5 font-mono text-[11px] text-ink-3">{subtitle}</p>
      </div>
      {section.events.length === 0 ? (
        <Card flat className="border-dashed p-5 text-center text-[13px] text-ink-3">{emptyText}</Card>
      ) : (
        <LoadMoreSection
          initialEvents={section.events}
          // LoadMoreSection only needs to know whether more exist; the API reports exact hasMore.
          totalCount={section.events.length + (section.hasMore ? 1 : 0)}
          batchSize={6}
          when={when}
          renderEvents={(evs) => (
              <ul className="flex flex-col gap-3">
                {evs.map(toWeek).map((e) => (
                  <li key={e.href}>
                    <Link href={e.href} className="block">
                      <Card flat className="flex gap-3 p-3">
                        <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[var(--radius)]"><Photo src={e.photo} height={92} /></div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                          <div><div className="text-h3 flex items-center gap-1 truncate"><span className="truncate">{e.title}</span>{e.verified && <VerifiedMark size={12} title="Verified organizer" />}</div><div className="mt-0.5 truncate text-[12px] text-ink-3">{e.sub}</div></div>
                          <div className="flex items-center gap-2 text-[12px] text-ink-3"><Icon name="cal" size={12} /> {e.date}<span>·</span><span className="truncate">{e.venue}</span>{e.trustLabel && <><span>·</span><span className="truncate font-mono text-[11px]">{e.trustLabel}</span></>}</div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          {e.stockLabel ? (
                            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${e.stockType === "sold-out" ? "bg-danger-soft text-danger" : "bg-warning/10 text-warning"}`}>{e.stockLabel}</span>
                          ) : (
                            <Icon name="heart" size={16} className="text-ink-4" />
                          )}
                          <span className="font-mono text-[12px] font-semibold">{e.price}</span>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
          )}
        />
      )}
    </section>
  );
}

function EmptySection({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <section className={compact ? "px-5" : "px-5 pb-6"}>
      <Card flat className="border-dashed p-5 text-center">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[13px] text-ink-3">{body}</p>
      </Card>
    </section>
  );
}

function VerifiedMark({ size = 12, title }: { size?: number; title?: string }) {
  return (
    <span role="img" aria-label={title ?? "Verified organizer"} title={title ?? "Verified organizer"} className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-white" style={{ width: size, height: size }}>
      <Icon name="check" size={Math.round(size * 0.7)} strokeWidth={3} />
    </span>
  );
}
