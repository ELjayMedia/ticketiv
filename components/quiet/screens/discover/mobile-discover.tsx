import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider, Avatar, AvatarStack } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";

/* ──────────────────────────────────────────────────────────────
 * Mobile Discover · "/" on phones
 * Direct port of QuietHome from the hi-fi.
 * Static demo data for now — wire to Supabase queries in Phase 2.
 * ────────────────────────────────────────────────────────────── */

const FILTERS = [
  { label: "This weekend", active: true },
  { label: "Music" },
  { label: "Comedy" },
  { label: "Free" },
  { label: "Tonight" },
];

const TONIGHT = [
  {
    photo: PHOTOS.dj_neon,
    title: "Tribal Tales",
    sub: "DJ Fun + 1 opener",
    time: "20:00",
    venue: "Cafe Natarani",
    price: "E450",
    chip: "5 left",
    chipVariant: "muted" as const,
  },
  {
    photo: PHOTOS.comedy_club,
    title: "Stand-up Saturday",
    sub: "A. Khan headlines",
    time: "21:30",
    venue: "House of MG",
    price: "E300",
    chip: "Last 12",
    chipVariant: "muted" as const,
  },
];

const THIS_WEEK = [
  {
    photo: PHOTOS.singer_red,
    title: "Sunset Set Vol 4",
    sub: "Riya M.",
    date: "Sat 26",
    venue: "Riverside Park",
    price: "From E600",
  },
  {
    photo: PHOTOS.workshop,
    title: "Pottery & wine",
    sub: "Hosted by Anya",
    date: "Sun 27",
    venue: "The Loft",
    price: "E1,200",
  },
  {
    photo: PHOTOS.fest_river,
    title: "River Sound Fest",
    sub: "3-day pass",
    date: "Fri 25 → Sun 27",
    venue: "Riverside Park",
    price: "From E2,400",
  },
];

export function MobileDiscover() {
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
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Search"
        >
          <Icon name="search" size={20} />
        </button>
        <button
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Notifications"
        >
          <Icon name="bell" size={20} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
      </header>

      {/* Location header */}
      <div className="px-5 pb-3.5">
        <div className="text-label">Showing events near</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <h1 className="text-h1 inline-flex items-center gap-1">
            Mbabane <Icon name="chevD" size={18} />
          </h1>
          <span className="flex-1" />
          <span className="font-mono text-[11px] text-ink-3">42 events</span>
        </div>
      </div>

      {/* Filter rail */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-5 pb-4">
        {FILTERS.map((f) => (
          <Chip key={f.label} variant={f.active ? "active" : "default"}>
            {f.label}
          </Chip>
        ))}
        <Chip>
          <Icon name="filter" size={12} /> Filters
        </Chip>
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
          <Photo src={PHOTOS.crowd_smoke} height={220} overlay="dim">
            <div className="mt-auto flex gap-2">
              <Chip
                className="border-transparent bg-white/95 text-ink"
                size="sm"
              >
                3-day festival
              </Chip>
              <Chip
                className="border-white/30 bg-white/15 text-white"
                size="sm"
              >
                22 artists
              </Chip>
            </div>
          </Photo>
          <div className="p-4">
            <h2 className="text-h2">River Sound Fest</h2>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-3">
              <span className="inline-flex items-center gap-1">
                <Icon name="cal" size={14} /> Fri 25 → Sun 27
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={14} /> Riverside Park
              </span>
            </div>
            <Divider className="my-3.5" />
            <div className="flex items-center">
              <div className="flex flex-1 flex-col">
                <div className="text-label">3-day pass from</div>
                <div className="mt-0.5 font-mono text-[18px] font-semibold">
                  E2,400
                </div>
              </div>
              <Link
                href="/events/river-sound-fest"
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
          <Link href="/?when=tonight" className="text-[13px] text-accent">
            See all
          </Link>
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
          {TONIGHT.map((e) => (
            <Link
              key={e.title}
              href={`/events/${e.title.toLowerCase().replace(/\s+/g, "-")}`}
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
          <span className="font-mono text-[11px] text-ink-3">42 EVENTS</span>
        </div>

        <ul className="flex flex-col gap-3">
          {THIS_WEEK.map((e) => (
            <li key={e.title}>
              <Link
                href={`/events/${e.title.toLowerCase().replace(/\s+/g, "-")}`}
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
