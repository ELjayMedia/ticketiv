import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";
import type { DiscoverEvent } from "@/lib/mappers/discover";

/* ──────────────────────────────────────────────────────────────
 * Desktop Discover · "/" on tablet+. Mirrors MobileDiscover.
 * ────────────────────────────────────────────────────────────── */

interface DesktopDiscoverProps {
  events?: DiscoverEvent[];
  editorPick?: DiscoverEvent | null;
  city?: string;
  totalEvents?: number;
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
}

const DEFAULT_GRID: GridRow[] = [
  { href: "/events/tribal-tales", photo: PHOTOS.dj_neon, title: "Tribal Tales · Vol 4", when: "Wed 30 Aug · 15:50", venue: "Cafe Natarani", price: "E450", chip: "5 left", trustLabel: null },
  { href: "/events/sunset-set", photo: PHOTOS.singer_red, title: "Sunset Set", when: "Sat 26 Aug · 18:00", venue: "Riverside Park", price: "E600", chip: "Selling fast", trustLabel: null },
  { href: "/events/stand-up-saturday", photo: PHOTOS.comedy_club, title: "Stand-up Saturday", when: "Sat 26 Aug · 21:30", venue: "House of MG", price: "E300", trustLabel: null },
  { href: "/events/pottery-and-wine", photo: PHOTOS.workshop, title: "Pottery & Wine", when: "Sun 27 Aug · 14:00", venue: "The Loft", price: "E1,200", trustLabel: null },
  { href: "/events/macbeth-revisited", photo: PHOTOS.theatre_curtain, title: "Macbeth · revisited", when: "Thu 31 Aug · 19:00", venue: "Standard Theatre", price: "E550", trustLabel: null },
  { href: "/events/night-market-mbabane", photo: PHOTOS.food_market, title: "Night Market: Mbabane", when: "Fri 25 Aug · 17:00", venue: "Coronation Park", price: "Free", trustLabel: null },
];

interface HeroRow {
  href: string;
  photo: string;
  title: string;
  dateLabel: string;
  venue: string;
  priceLabel: string;
  topChip: string;
  subtitle: string;
  trustLabel: string | null;
}

const DEFAULT_HERO: HeroRow = {
  href: "/events/river-sound-fest",
  photo: PHOTOS.crowd_smoke,
  title: "River Sound Fest",
  dateLabel: "FRI 25 → SUN 27 JUL · RIVERSIDE PARK",
  venue: "Riverside Park",
  priceLabel: "E2,400",
  topChip: "Editor's pick · 3-day festival",
  subtitle: "22 artists across 3 stages. Camping & food vendors on-site. Day passes from E950.",
  trustLabel: null,
};

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
  };
}

function toHero(ev: DiscoverEvent): HeroRow {
  return {
    href: ev.href,
    photo: ev.photo || PHOTOS.crowd_smoke,
    title: ev.title,
    dateLabel: ev.whenLabel.toUpperCase() + (ev.venue ? ` · ${ev.venue.toUpperCase()}` : ""),
    venue: ev.venue,
    priceLabel: ev.priceLabel.replace(/^From\s+/, ""),
    topChip: `Editor's pick · ${ev.category ?? "Featured"}`,
    subtitle: ev.category ? `Curated for fans of ${ev.category.toLowerCase()}.` : "",
    trustLabel: ev.soldLabel,
  };
}

export function DesktopDiscover({
  events,
  editorPick,
  city = "Mbabane",
  totalEvents,
}: DesktopDiscoverProps = {}) {
  const GRID_EVENTS = events && events.length > 0 ? events.map(toGrid) : DEFAULT_GRID;
  const HERO = editorPick ? toHero(editorPick) : DEFAULT_HERO;
  const total = totalEvents ?? events?.length ?? 42;
  return (
    <div className="mx-auto max-w-[1280px] px-10 py-6">
      {/* Inline search bar — desktop discover's prominent entry point.
          Plain HTML GET form so we stay a server component. */}
      <form
        action="/search"
        method="get"
        role="search"
        className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3 focus-within:border-line-2"
      >
        <Icon name="search" size={16} className="text-ink-3" />
        <input
          type="text"
          name="q"
          placeholder="Search events, artists, venues…"
          aria-label="Search events"
          className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-ink-3"
        />
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/search?category=Music"
            className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-semibold text-ink-3 hover:text-ink"
          >
            Music
          </Link>
          <Link
            href="/search?category=Comedy"
            className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-semibold text-ink-3 hover:text-ink"
          >
            Comedy
          </Link>
          <Link
            href="/search?onlyFree=1"
            className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-semibold text-ink-3 hover:text-ink"
          >
            Free
          </Link>
          <Link
            href="/search?when=weekend"
            className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-semibold text-ink-3 hover:text-ink"
          >
            Weekend
          </Link>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-ink px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-ink-2"
        >
          Search
        </button>
      </form>

      {/* Trust rail */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-2.5 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-success" />
          Verified organizers only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-success" />
          Secure checkout · cards &amp; mobile money
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-success" />
          Free transfers · refund per organizer policy
        </span>
        <span className="flex-1" />
        <Link href="/help" className="font-mono text-[11px] text-accent hover:underline">
          How it works ›
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-end justify-between pb-6">
        <div>
          <div className="text-label">Showing events near</div>
          <h1 className="mt-1 inline-flex items-center gap-2 text-[40px] font-semibold leading-none tracking-[-0.025em]">
            {city} <Icon name="chevD" size={28} />
          </h1>
          <p className="mt-2 font-mono text-[12px] text-ink-3">
            {total} EVENTS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/search?when=week"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-bg"
          >
            <Icon name="cal" size={14} /> This week
            <Icon name="chevD" size={12} />
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-bg"
          >
            <Icon name="filter" size={14} /> Filters
          </Link>
        </div>
      </div>

      {/* Editor's pick hero */}
      <Card className="mb-8 overflow-hidden">
        <div className="grid grid-cols-[1fr_320px]">
          <Photo src={HERO.photo} height={380} overlay="heavy">
            <div className="flex items-start justify-between">
              <Chip variant="accent" size="sm" className="bg-white/95 text-accent">
                <Icon name="spark" size={11} /> {HERO.topChip}
              </Chip>
              <div className="text-right text-white">
                <div className="text-label text-white/90">WHERE</div>
                <div className="font-mono text-[13px] font-semibold">{HERO.venue.toUpperCase()}</div>
              </div>
            </div>
            <div className="mt-auto flex items-end justify-between gap-8">
              <div>
                <div className="text-label text-white/90">{HERO.dateLabel}</div>
                <div className="mt-2 text-[64px] font-semibold leading-[0.85] tracking-[-0.025em] text-white">
                  {HERO.title}
                </div>
              </div>
            </div>
          </Photo>
          <div className="flex flex-col p-6">
            <div className="text-label">FROM</div>
            <div className="mt-1 font-mono text-[44px] font-semibold leading-none">
              {HERO.priceLabel}
            </div>
            {HERO.subtitle && (
              <p className="mt-3 text-[13px] text-ink-3">{HERO.subtitle}</p>
            )}
            {HERO.trustLabel && (
              <p className="mt-2 font-mono text-[11px] text-ink-3">
                {HERO.trustLabel}
              </p>
            )}
            <Divider className="my-4" />
            <Link
              href={HERO.href}
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Get tickets <Icon name="arrowR" size={14} />
            </Link>
          </div>
        </div>
      </Card>

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

        {/* Right: grid */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-h2">This week</h2>
            <div className="flex items-center gap-1 font-mono text-[11px] text-ink-3">
              SORT BY
              <button className="ml-1 inline-flex items-center gap-1 rounded border border-line-2 px-2 py-0.5 text-ink">
                Recommended <Icon name="chevD" size={10} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {GRID_EVENTS.map((e) => (
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
                    <div className="text-h3 truncate">{e.title}</div>
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
                      {e.trustLabel ? (
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

          <div className="mt-8 flex justify-center">
            <button className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-4 py-2 text-[13px] font-medium hover:bg-bg">
              Load more events
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
