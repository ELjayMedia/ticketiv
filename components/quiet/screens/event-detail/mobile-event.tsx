import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider, Avatar, AvatarStack } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { PHOTOS } from "@/lib/photos";
import { formatPrice } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * Mobile event detail · `/events/[id]` on phones.
 * Port of QuietEvent. Below the fold:
 *   meta grid → lineup → about → fact card → organizer → going
 * Bottom sticky CTA shows "from" price + Get tickets.
 *
 * `event` is the data shape from Supabase (Phase 2 wiring).
 * For now, a default mock is provided so the route renders without
 * a backend.
 * ────────────────────────────────────────────────────────────── */

export interface MobileEventProps {
  event?: MobileEventData;
}

export interface MobileEventData {
  id: string;
  title: string;
  category: string;
  posterUrl: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  venue: { name: string; distanceKm: number };
  facts: ReadonlyArray<readonly [string, string]>;
  lineup: ReadonlyArray<{ name: string; role: string; photo: string; headliner?: boolean }>;
  organizer: { name: string; handle: string; eventsHosted: number; rating: number; verified: boolean; photo: string };
  goingFriends: { count: number; names: string[]; photos: string[] };
  fromPriceMinor: number;
}

const DEFAULT_EVENT: MobileEventData = {
  id: "tribal-tales",
  title: "Tribal Tales",
  category: "Music · DJ set",
  posterUrl: PHOTOS.dj_set,
  description:
    "Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie. Curated by Rishabh Mehta for the 4th edition of the Tribal Tales tour.",
  dateLabel: "Wed 30 Aug",
  timeLabel: "15:50 → 17:50",
  venue: { name: "Cafe Natarani", distanceKm: 12 },
  facts: [
    ["Duration", "3 hours"],
    ["Language", "English"],
    ["Age limit", "18+"],
    ["Entry", "QR + photo ID"],
    ["Re-entry", "Not permitted"],
    ["Refund window", "48 hours before"],
  ],
  lineup: [
    { name: "DJ Fun", role: "Headliner · 16:30", photo: PHOTOS.face_4, headliner: true },
    { name: "Riya M.", role: "Opener · 15:50", photo: PHOTOS.face_2 },
  ],
  organizer: {
    name: "Rishabh Mehta",
    handle: "rishabh",
    eventsHosted: 23,
    rating: 4.8,
    verified: true,
    photo: PHOTOS.face_6,
  },
  goingFriends: {
    count: 5,
    names: ["Farah", "Salman"],
    photos: [PHOTOS.face_1, PHOTOS.face_2, PHOTOS.face_3, PHOTOS.face_7, PHOTOS.face_8],
  },
  fromPriceMinor: 50000, // E500
};

export function MobileEvent({ event = DEFAULT_EVENT }: MobileEventProps) {
  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Hero photo (no top spacer — hero goes edge-to-edge) */}
        <div className="relative">
          <Photo src={event.posterUrl} height={360} overlay="dim">
            {/* Top action bar inside hero */}
            <div className="absolute inset-x-4 top-12 flex items-start gap-2">
              <Link
                href="/"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 hover:bg-white"
                aria-label="Back"
              >
                <Icon name="chevL" size={18} className="text-ink" />
              </Link>
              <span className="flex-1" />
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 hover:bg-white"
                aria-label="Share"
              >
                <Icon name="share" size={18} className="text-ink" />
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 hover:bg-white"
                aria-label="Save"
              >
                <Icon name="heart" size={18} className="text-ink" />
              </button>
            </div>

            {/* Title overlay */}
            <div className="mt-auto">
              <Chip
                size="sm"
                className="border-transparent bg-white/95 text-ink"
              >
                {event.category}
              </Chip>
              <h1 className="mt-2.5 text-[30px] font-semibold leading-tight tracking-[-0.022em] text-white">
                {event.title}
              </h1>
              <div className="mt-1 font-mono text-[12px] uppercase text-white/85">
                {event.lineup.map((a) => a.name).join(" + ")}
              </div>
            </div>
          </Photo>
        </div>

        {/* Meta cards */}
        <section className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3" flat>
              <div className="text-label">When</div>
              <div className="mt-1 text-[15px] font-semibold">{event.dateLabel}</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-3">{event.timeLabel}</div>
            </Card>
            <Card className="p-3" flat>
              <div className="text-label">Where</div>
              <div className="mt-1 text-[15px] font-semibold">{event.venue.name}</div>
              <button className="mt-0.5 font-mono text-[11px] text-accent">
                {event.venue.distanceKm} km · directions ↗
              </button>
            </Card>
          </div>
        </section>

        {/* Lineup */}
        <section className="px-5 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h3">Lineup</h2>
            <span className="font-mono text-[11px] text-ink-3">
              {event.lineup.length} artist{event.lineup.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {event.lineup.map((a) => (
              <li key={a.name}>
                <Card className="flex items-center gap-3 p-2.5" flat>
                  <Avatar src={a.photo} size={40} />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold">{a.name}</span>
                      {a.headliner && (
                        <Chip variant="accent" size="sm">
                          Headliner
                        </Chip>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-ink-3">{a.role}</span>
                  </div>
                  <Button variant="default" size="xs">
                    Follow
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* About */}
        <section className="px-5 pt-5">
          <h2 className="text-h3 mb-2.5">About</h2>
          <p className="text-[14px] leading-relaxed text-ink-2">
            {event.description}{" "}
            <button className="font-semibold text-accent">read more</button>
          </p>
        </section>

        {/* Fact card */}
        <section className="px-5 pt-5">
          <Card className="p-3.5" flat>
            {event.facts.map(([k, v], i, arr) => (
              <div
                key={k}
                className={
                  "flex items-center py-1.5 " +
                  (i < arr.length - 1 ? "border-b border-line" : "")
                }
              >
                <span className="flex-1 font-mono text-[11px] uppercase text-ink-3">
                  {k}
                </span>
                <span className="text-[13px] font-medium">{v}</span>
              </div>
            ))}
          </Card>
        </section>

        {/* Organizer */}
        <section className="px-5 pt-5">
          <Card className="flex items-center gap-3 p-3.5">
            <Avatar src={event.organizer.photo} size={44} />
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold">{event.organizer.name}</span>
                {event.organizer.verified && (
                  <Chip variant="accent" size="sm">
                    Verified
                  </Chip>
                )}
              </div>
              <span className="font-mono text-[11px] text-ink-3">
                @{event.organizer.handle} · {event.organizer.eventsHosted} events · ★{" "}
                {event.organizer.rating.toFixed(1)}
              </span>
            </div>
            <Button variant="default" size="xs">
              Follow
            </Button>
          </Card>
        </section>

        {/* Friends going */}
        <section className="px-5 pb-6 pt-3">
          <Card className="flex items-center gap-3 p-3.5">
            <AvatarStack>
              {event.goingFriends.photos.slice(0, 5).map((p, i) => (
                <Avatar key={i} src={p} size={28} />
              ))}
            </AvatarStack>
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-semibold">
                {event.goingFriends.names.join(", ")}
                {event.goingFriends.count > event.goingFriends.names.length &&
                  ` + ${event.goingFriends.count - event.goingFriends.names.length}`}
              </span>
              <span className="font-mono text-[11px] text-ink-3">
                {event.goingFriends.count} friends going
              </span>
            </div>
            <Button variant="default" size="xs">
              Invite
            </Button>
          </Card>
        </section>

        <div className="h-24" />
      </div>

      {/* Sticky bottom CTA */}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <div className="flex flex-col">
          <span className="text-label">From</span>
          <span className="font-mono text-[20px] font-semibold leading-none">
            {formatPrice(event.fromPriceMinor)}
          </span>
        </div>
        <Link
          href={`/events/${event.id}/checkout`}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90"
        >
          Get tickets <Icon name="arrowR" size={16} />
        </Link>
      </div>
    </div>
  );
}
