import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { SearchTrigger } from "@/components/quiet/search/search-overlay";
import { PHOTOS } from "@/lib/photos";
import type { DiscoverEvent } from "@/lib/mappers/discover";

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
  trustLabel: string | null;
  verified: boolean;
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
    trustLabel: ev.soldLabel,
    verified: ev.organizerVerified,
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
    trustLabel: ev.soldLabel,
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
  tonight: tonightProp,
  thisWeek: thisWeekProp,
  editorPick: editorPickProp,
  city = "Mbabane",
  eventCount,
}: MobileDiscoverProps = {}) {
  const TONIGHT = tonightProp?.map(toTonight) ?? [];
  const THIS_WEEK = thisWeekProp?.map(toWeek) ?? [];
  const HERO = editorPickProp ? toEditorPick(editorPickProp) : null;
  const derivedTotal = (tonightProp?.length ?? 0) + (thisWeekProp?.length ?? 0);
  const total = eventCount ?? derivedTotal;

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
        <div className="text-label">Showing events near</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <h1 className="text-h1 inline-flex items-center gap-1">{city} <Icon name="chevD" size={18} /></h1>
          <span className="flex-1" />
          <span className="font-mono text-[11px] text-ink-3">{total} events</span>
        </div>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-5 pb-4">
        {FILTERS.map((f) => (
          <Link key={f.label} href={f.href}><Chip variant={f.active ? "active" : "default"}>{f.label}</Chip></Link>
        ))}
        <Link href="/search"><Chip><Icon name="filter" size={12} /> Filters</Chip></Link>
      </div>

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

      <section className="pb-6">
        <div className="flex items-end justify-between px-5 pb-3">
          <div>
            <div className="flex items-center gap-2"><h3 className="text-h2 text-[18px]">Tonight</h3><Chip variant="accent" size="sm">{TONIGHT.length} live</Chip></div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">EVENTS STARTING IN THE NEXT 6 HOURS</p>
          </div>
          <Link href="/search?when=tonight" className="text-[13px] text-accent">See all</Link>
        </div>
        {TONIGHT.length === 0 ? (
          <EmptySection title="No events tonight" body="Check back soon or broaden your search filters." compact />
        ) : (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
            {TONIGHT.map((e) => (
              <Link key={e.href} href={e.href} className="block w-[240px] shrink-0">
                <Card className="overflow-hidden">
                  <Photo src={e.photo} height={140} overlay="dim"><div className="mt-auto flex items-center gap-1.5"><Chip className="border-transparent bg-white/95 text-ink" size="sm">{e.time}</Chip><Chip variant={e.chipVariant} size="sm">{e.chip}</Chip></div></Photo>
                  <div className="p-3">
                    <div className="text-h3 flex items-center gap-1 truncate"><span className="truncate">{e.title}</span>{e.verified && <VerifiedMark size={12} title="Verified organizer" />}</div>
                    <div className="mt-0.5 truncate text-[12px] text-ink-3">{e.sub} · {e.venue}</div>
                    <div className="mt-2 flex items-center justify-between gap-2"><span className="font-mono text-[13px] font-semibold">{e.price}</span>{e.trustLabel && <span className="font-mono text-[11px] text-ink-3">{e.trustLabel}</span>}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="px-5 pb-6">
        <div className="mb-3 flex items-end justify-between"><h3 className="text-h2 text-[18px]">This week</h3><span className="font-mono text-[11px] text-ink-3">{THIS_WEEK.length} EVENTS</span></div>
        {THIS_WEEK.length === 0 ? (
          <Card flat className="border-dashed p-5 text-center text-[13px] text-ink-3">No events listed this week.</Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {THIS_WEEK.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="block">
                  <Card flat className="flex gap-3 p-3">
                    <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[var(--radius)]"><Photo src={e.photo} height={92} /></div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                      <div><div className="text-h3 flex items-center gap-1 truncate"><span className="truncate">{e.title}</span>{e.verified && <VerifiedMark size={12} title="Verified organizer" />}</div><div className="mt-0.5 truncate text-[12px] text-ink-3">{e.sub}</div></div>
                      <div className="flex items-center gap-2 text-[12px] text-ink-3"><Icon name="cal" size={12} /> {e.date}<span>·</span><span className="truncate">{e.venue}</span>{e.trustLabel && <><span>·</span><span className="truncate font-mono text-[11px]">{e.trustLabel}</span></>}</div>
                    </div>
                    <div className="flex flex-col items-end justify-between"><Icon name="heart" size={16} className="text-ink-4" /><span className="font-mono text-[12px] font-semibold">{e.price}</span></div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
