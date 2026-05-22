import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";

/* ──────────────────────────────────────────────────────────────
 * Desktop Discover · "/" on tablet+
 * Three-column grid below an editor's-pick hero, with a sticky
 * filter rail on the left. The DesktopNav lives in the layout.
 * ────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { icon: "music", label: "Music", count: 18 },
  { icon: "fire", label: "Comedy", count: 6 },
  { icon: "users", label: "Workshops", count: 4 },
  { icon: "ticket", label: "Theatre", count: 3 },
  { icon: "spark", label: "Festivals", count: 2 },
] as const;

const GRID_EVENTS = [
  {
    photo: PHOTOS.dj_neon,
    title: "Tribal Tales · Vol 4",
    when: "Wed 30 Aug · 15:50",
    venue: "Cafe Natarani",
    price: "E450",
    chip: "5 left",
  },
  {
    photo: PHOTOS.singer_red,
    title: "Sunset Set",
    when: "Sat 26 Aug · 18:00",
    venue: "Riverside Park",
    price: "E600",
    chip: "Selling fast",
  },
  {
    photo: PHOTOS.comedy_club,
    title: "Stand-up Saturday",
    when: "Sat 26 Aug · 21:30",
    venue: "House of MG",
    price: "E300",
  },
  {
    photo: PHOTOS.workshop,
    title: "Pottery & Wine",
    when: "Sun 27 Aug · 14:00",
    venue: "The Loft",
    price: "E1,200",
  },
  {
    photo: PHOTOS.theatre_curtain,
    title: "Macbeth · revisited",
    when: "Thu 31 Aug · 19:00",
    venue: "Standard Theatre",
    price: "E550",
  },
  {
    photo: PHOTOS.food_market,
    title: "Night Market: Mbabane",
    when: "Fri 25 Aug · 17:00",
    venue: "Coronation Park",
    price: "Free",
  },
];

export function DesktopDiscover() {
  return (
    <div className="mx-auto max-w-[1280px] px-10 py-6">
      {/* Page header */}
      <div className="flex items-end justify-between pb-6">
        <div>
          <div className="text-label">Showing events near</div>
          <h1 className="mt-1 inline-flex items-center gap-2 text-[40px] font-semibold leading-none tracking-[-0.025em]">
            Mbabane <Icon name="chevD" size={28} />
          </h1>
          <p className="mt-2 font-mono text-[12px] text-ink-3">
            42 EVENTS · 11 VENUES · 6 LIVE TONIGHT
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-bg">
            <Icon name="cal" size={14} /> This week
            <Icon name="chevD" size={12} />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-bg">
            <Icon name="filter" size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Editor's pick hero */}
      <Card className="mb-8 overflow-hidden">
        <div className="grid grid-cols-[1fr_320px]">
          <Photo src={PHOTOS.crowd_smoke} height={380} overlay="heavy">
            <div className="flex items-start justify-between">
              <Chip variant="accent" size="sm" className="bg-white/95 text-accent">
                <Icon name="spark" size={11} /> Editor's pick · 3-day festival
              </Chip>
              <div className="text-right text-white">
                <div className="text-label text-white/90">HEADLINER</div>
                <div className="font-mono text-[13px] font-semibold">DJ FUN + 21 MORE</div>
              </div>
            </div>
            <div className="mt-auto flex items-end justify-between gap-8">
              <div>
                <div className="text-label text-white/90">FRI 25 → SUN 27 JUL · RIVERSIDE PARK</div>
                <div className="mt-2 text-[76px] font-semibold leading-[0.85] tracking-[-0.025em] text-white">
                  River<br />Sound<br />Fest
                </div>
              </div>
            </div>
          </Photo>
          <div className="flex flex-col p-6">
            <div className="text-label">3-DAY PASS FROM</div>
            <div className="mt-1 font-mono text-[44px] font-semibold leading-none">
              E2,400
            </div>
            <p className="mt-3 text-[13px] text-ink-3">
              22 artists across 3 stages. Camping & food vendors on-site.
              Day passes from E950.
            </p>
            <Divider className="my-4" />
            <div className="text-label">YOU'D LIKE THIS BECAUSE</div>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
              <li className="inline-flex items-center gap-1.5">
                <Icon name="check" size={14} className="text-accent" /> You saved River Sound 2025
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="check" size={14} className="text-accent" /> 3 friends going
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="check" size={14} className="text-accent" /> DJ Fun · followed
              </li>
            </ul>
            <Link
              href="/events/river-sound-fest"
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Get passes <Icon name="arrowR" size={14} />
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
                <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[13px] hover:bg-bg">
                  <Icon name={c.icon} size={16} className="text-ink-3" />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span className="font-mono text-[11px] text-ink-3">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
          <Divider className="my-4" />
          <div className="text-label mb-3">Price</div>
          <div className="flex flex-col gap-2 text-[13px]">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="accent-accent" /> Free
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="accent-accent" /> Under E500
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="accent-accent" /> E500 – E1,500
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="accent-accent" /> E1,500+
            </label>
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
                key={e.title}
                href={`/events/${e.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}
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
                      <span className="text-[12px] text-accent group-hover:underline">
                        Details →
                      </span>
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
