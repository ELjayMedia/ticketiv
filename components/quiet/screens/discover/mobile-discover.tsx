import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider, Avatar, AvatarStack } from "@/components/quiet/ui/primitives";
import { SearchTrigger } from "@/components/quiet/search/search-overlay";
import { PHOTOS } from "@/lib/photos";
import type { DiscoverEvent } from "@/lib/mappers/discover";

/* ──────────────────────────────────────────────────────────────
 * Mobile Discover · "/" on phones.
 *
 * The Supabase-backed `/` route passes `tonight`, `thisWeek` and
 * `editorPick` from `v_events_public`. When unset (no config / no
 * data), we fall back to the static demo arrays so the screen still
 * renders during local dev and storybook-style review.
 * ────────────────────────────────────────────────────────────── */

interface MobileDiscoverProps {
  tonight?: DiscoverEvent[];
  thisWeek?: DiscoverEvent[];
  editorPick?: DiscoverEvent | null;
  city?: string;
  eventCount?: number;
}

const FILTERS: ReadonlyArray<{ label: string; href: string; active?: boolean }> = [
  { label: "This weekend", href: "/search?when=weekend", active: true },
  { label: "Music", href: "/search?category=Music" },
  { label: "Comedy", href: "/search?category=Comedy" },
  { label: "Free", href: "/search?onlyFree=1" },
  { label: "Tonight", href: "/search?when=tonight" },
];

interface TonightRow {
  href: string;
  photo: string;
  title: string;
  sub: string;
  time: string;
  venue: string;
  price: string;
  chip: string;
  chipVariant: "muted" | "accent";
}

interface WeekRow {
  href: string;
  photo: string;
  title: string;
  sub: string;
  date: string;
  venue: string;
  price: string;
}

const DEFAULT_TONIGHT: TonightRow[] = [
  {
    href: "/events/tribal-tales",
    photo: PHOTOS.dj_neon,
    title: "Tribal Tales",
    sub: "DJ Fun + 1 opener",
    time: "20:00",
    venue: "Cafe Natarani",
    price: "E450",
    chip: "5 left",
    chipVariant: "muted",
  },
  {
    href: "/events/stand-up-saturday",
    photo: PHOTOS.comedy_club,
    title: "Stand-up Saturday",
    sub: "A. Khan headlines",
    time: "21:30",
    venue: "House of MG",
    price: "E300",
    chip: "Last 12",
    chipVariant: "muted",
  },
];

const DEFAULT_THIS_WEEK: WeekRow[] = [
  {
    href: "/events/sunset-set-vol-4",
    photo: PHOTOS.singer_red,
    title: "Sunset Set Vol 4",
    sub: "Riya M.",
    date: "Sat 26",
    venue: "Riverside Park",
    price: "From E600",
  },
  {
    href: "/events/pottery-and-wine",
    photo: PHOTOS.workshop,
    title: "Pottery & wine",
    sub: "Hosted by Anya",
    date: "Sun 27",
    venue: "The Loft",
    price: "E1,200",
  },
  {
    href: "/events/river-sound-fest",
    photo: PHOTOS.fest_river,
    title: "River Sound Fest",
    sub: "3-day pass",
    date: "Fri 25 → Sun 27",
    venue: "Riverside Park",
    price: "From E2,400",
  },
];

interface EditorPickRow {
  href: string;
  photo: string;
  title: string;
  dateLabel: string;
  venue: string;
  priceLabel: string;
  topChip: string;
  bottomChip: string;
}

const DEFAULT_EDITOR_PICK: EditorPickRow = {
  href: "/events/river-sound-fest",
  photo: PHOTOS.crowd_smoke,
  title: "River Sound Fest",
  dateLabel: "Fri 25 → Sun 27",
  venue: "Riverside Park",
  priceLabel: "E2,400",
  topChip: "3-day festival",
  bottomChip: "22 artists",
};

function toTonight(ev: DiscoverEvent): TonightRow {
  return {
    href: ev.href,
    photo: ev.photo || PHOTOS.dj_neon,
    title: ev.title,
    sub: ev.category ?? "Live event",
    time: ev.timeShort || "Time TBA",
    venue: ev.venue,
    price: ev.priceLabel,
    chip: ev.city ?? "Tonight",
    chipVariant: "muted",
  };
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
  };
}

export function MobileDiscover({
  tonight: tonightProp,
  thisWeek: thisWeekProp,
  editorPick: editorPickProp,
  city = "Mbabane",
  eventCount,
}: MobileDiscoverProps = {}) {
  const TONIGHT = tonightProp && tonightProp.length > 0 ? tonightProp.map(toTonight) : DEFAULT_TONIGHT;
  const THIS_WEEK = thisWeekProp && thisWeekProp.length > 0 ? thisWeekProp.map(toWeek) : DEFAULT_THIS_WEEK;
  const HERO = editorPickProp ? toEditorPick(editorPickProp) : DEFAULT_EDITOR_PICK;
  const derivedTotal = (tonightProp?.length ?? 0) + (thisWeekProp?.length ?? 0);
  const total = eventCount ?? (derivedTotal > 0 ? derivedTotal : 42);
  return (
    <div className="flex flex-col">
      {/* status spacer */}
      <div className="h-14" />

      {/* Top bar */}
      <header className="flex items-center gap-2 px-5 pb-4 pt-2">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
            T
          </span>
          <span className="text-[17px] font-semibold tracking-tight">ticketiv</span>
        </Link>
        <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
          BETA
        </span>
        <span className="flex-1" />
        <SearchTrigger
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Search"
        >
          <Icon name="search" size={20} />
        </SearchTrigger>
        <Link
          href="/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Notifications"
        >
          <Icon name="bell" size={20} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </Link>
      </header>

      {/* Location header */}
      <div className="px-5 pb-3.5">
        <div className="text-label">Showing events near</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <h1 className="text-h1 inline-flex items-center gap-1">
            {city} <Icon name="chevD" size={18} />
          </h1>
          <span className="flex-1" />
          <span className="font-mono text-[11px] text-ink-3">{total} events</span>
        </div>
      </div>

      {/* Filter rail */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-5 pb-4">
        {FILTERS.map((f) => (
          <Link key={f.label} href={f.href}>
            <Chip variant={f.active ? "active" : "default"}>{f.label}</Chip>
          </Link>
        ))}
        <Link href="/search">
          <Chip>
            <Icon name="filter" size={12} /> Filters
          </Chip>
        </Link>
      </div>

      {/* Editor's pick hero */}
      <section className="px-5 pb-6">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
            <Icon name="spark" size={12} /> Editor's pick
          </span>
          <span className="flex-1" />
          <span className="font-mono text-[10px] text-ink-3">UPDATED 2H AGO</span>
        </div>

        <Card className="overflow-hidden">
          <Photo src={HERO.photo} height={220} overlay="dim">
            <div className="mt-auto flex gap-2">
              <Chip
                className="border-transparent bg-white/95 text-ink"
                size="sm"
              >
                {HERO.topChip}
              </Chip>
              <Chip
                className="border-white/30 bg-white/15 text-white"
                size="sm"
              >
                {HERO.bottomChip}
              </Chip>
            </div>
          </Photo>
          <div className="p-4">
            <h2 className="text-h2">{HERO.title}</h2>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-3">
              <span className="inline-flex items-center gap-1">
                <Icon name="cal" size={14} /> {HERO.dateLabel}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={14} /> {HERO.venue}
              </span>
            </div>
            <Divider className="my-3.5" />
            <div className="flex items-center">
              <div className="flex flex-1 flex-col">
                <div className="text-label">From</div>
                <div className="mt-0.5 font-mono text-[18px] font-semibold">
                  {HERO.priceLabel}
                </div>
              </div>
              <Link
                href={HERO.href}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Get passes <Icon name="arrowR" size={14} />
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Tonight section */}
      <section className="pb-6">
        <div className="flex items-end justify-between px-5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-h2 text-[18px]">Tonight</h3>
              <Chip variant="accent" size="sm">
                12 live
              </Chip>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">
              EVENTS STARTING IN THE NEXT 6 HOURS
            </p>
          </div>
          <Link href="/search?when=tonight" className="text-[13px] text-accent">
            See all
          </Link>
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
          {TONIGHT.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="block w-[240px] shrink-0"
            >
              <Card className="overflow-hidden">
                <Photo src={e.photo} height={140} overlay="dim">
                  <div className="mt-auto flex items-center gap-1.5">
                    <Chip
                      className="border-transparent bg-white/95 text-ink"
                      size="sm"
                    >
                      {e.time}
                    </Chip>
                    <Chip variant={e.chipVariant} size="sm">
                      {e.chip}
                    </Chip>
                  </div>
                </Photo>
                <div className="p-3">
                  <div className="text-h3 truncate">{e.title}</div>
                  <div className="mt-0.5 truncate text-[12px] text-ink-3">
                    {e.sub} · {e.venue}
                  </div>
                  <div className="mt-2 font-mono text-[13px] font-semibold">
                    {e.price}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* This week list */}
      <section className="px-5 pb-6">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-h2 text-[18px]">This week</h3>
          <span className="font-mono text-[11px] text-ink-3">{THIS_WEEK.length} EVENTS</span>
        </div>

        <ul className="flex flex-col gap-3">
          {THIS_WEEK.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="block"
              >
                <Card flat className="flex gap-3 p-3">
                  <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[var(--radius)]">
                    <Photo src={e.photo} height={92} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div>
                      <div className="text-h3 truncate">{e.title}</div>
                      <div className="mt-0.5 truncate text-[12px] text-ink-3">
                        {e.sub}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-ink-3">
                      <Icon name="cal" size={12} /> {e.date}
                      <span>·</span>
                      <span className="truncate">{e.venue}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Icon name="heart" size={16} className="text-ink-4" />
                    <span className="font-mono text-[12px] font-semibold">
                      {e.price}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Friends going block */}
      <section className="px-5 pb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AvatarStack>
              <Avatar src={PHOTOS.face_1} size={32} />
              <Avatar src={PHOTOS.face_3} size={32} />
              <Avatar src={PHOTOS.face_5} size={32} />
            </AvatarStack>
            <div className="flex-1">
              <div className="text-[13px] font-medium">
                3 friends are going this week
              </div>
              <div className="text-[12px] text-ink-3">
                See what Sipho, Anele & Lerato booked
              </div>
            </div>
            <Link
              href="/friends"
              className="inline-flex h-8 items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 text-[12px] font-semibold hover:bg-bg"
            >
              View
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
