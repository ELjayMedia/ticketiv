import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider, Avatar } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { PHOTOS } from "@/lib/photos";
import {
  formatPrice,
  formatGoingCount,
  formatSoldCount,
  formatRecentSoldLabel,
  formatLineupLabel,
  formatScarcityLabel,
} from "@/lib/format";
import type { MobileEventData } from "./mobile-event";

/* ──────────────────────────────────────────────────────────────
 * Desktop event detail · `/events/[id]` on md+
 *
 * Two-column layout:
 *   - LEFT: hero, meta strip, tabs (About/Lineup/Venue/Reviews/FAQ),
 *     lineup cards, venue map placeholder.
 *   - RIGHT: 380-px sticky checkout card with ticket types and CTA.
 *
 * The sticky right panel is the conversion engine — keep it visible
 * above-the-fold and never let it scroll out of frame.
 * ────────────────────────────────────────────────────────────── */

interface DesktopEventProps {
  event?: DesktopEventData;
}

export interface DesktopEventData extends MobileEventData {
  /** Long-form description shown in About tab */
  longDescription: string;
  amenities: string[];
  ticketTypes: ReadonlyArray<{
    id: string;
    name: string;
    priceMinor: number;
    remaining: number | null;
    description?: string;
  }>;
}

const DEFAULT_EVENT: DesktopEventData = {
  id: "tribal-tales",
  title: "Tribal Tales",
  category: "Music · DJ set",
  posterUrl: PHOTOS.dj_set,
  description:
    "Sunset music night with rotating DJ set. Food trucks on-site.",
  longDescription:
    "Sunset music night with rotating DJ set. Food trucks on-site. Outdoor lawn — bring a hoodie! Curated by Rishabh Mehta for the 4th edition of the Tribal Tales tour. Last entry at 19:00, no re-entry.",
  dateLabel: "Wed 30 Aug",
  timeLabel: "15:50 → 17:50",
  venue: { name: "Cafe Natarani", distanceKm: 12 },
  facts: [
    ["Duration", "3 hours"],
    ["Doors at", "15:00"],
    ["Language", "English"],
    ["Subtitles", "Available on request"],
  ],
  amenities: [
    "Outdoor",
    "Food on-site",
    "18+",
    "Wheelchair access",
    "Cash bar",
    "Photography allowed",
  ],
  lineup: [
    {
      name: "DJ Fun",
      role: "Headliner · 16:30 — 17:50",
      photo: PHOTOS.face_4,
      headliner: true,
    },
    {
      name: "Riya M.",
      role: "Opener · 15:50 — 16:30",
      photo: PHOTOS.face_2,
    },
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
  fromPriceMinor: 50000,
  ticketTypes: [
    {
      id: "regular",
      name: "Regular",
      priceMinor: 50000,
      remaining: 5,
      description: "Standing · general access",
    },
    {
      id: "premium",
      name: "Premium",
      priceMinor: 120000,
      remaining: 18,
      description: "Front rows · welcome drink",
    },
    {
      id: "vip",
      name: "VIP",
      priceMinor: 250000,
      remaining: 0,
      description: "Meet & greet · sold out",
    },
  ],
};

const TABS = ["About", "Lineup", "Venue", "Reviews", "FAQ"] as const;

export function DesktopEvent({ event = DEFAULT_EVENT }: DesktopEventProps) {
  return (
    <div className="mx-auto max-w-[1280px] px-10">
      {/* Hero photo */}
      <div className="pt-6">
        <Photo
          src={event.posterUrl}
          height={420}
          overlay="dim"
          className="rounded-2xl"
        >
          <div className="mt-auto">
            <Chip
              size="sm"
              className="border-transparent bg-white/95 text-ink"
            >
              {event.category}
            </Chip>
            <h1 className="mt-3 text-[56px] font-semibold leading-none tracking-[-0.025em] text-white">
              {event.title}
            </h1>
            <div className="mt-1.5 font-mono text-[14px] uppercase text-white/85">
              {formatLineupLabel(event.lineup.map((a) => a.name)).toUpperCase()}
            </div>
          </div>
        </Photo>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_380px] items-start gap-8 pt-8 pb-12">
        {/* ── Left column ─────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          {/* Trust signal chip row */}
          <DesktopTrustRow event={event} />

          {/* Meta strip (4 facts) */}
          <Card className="grid grid-cols-4 p-0">
            {[
              ["cal", "When", event.dateLabel, event.timeLabel],
              ["pin", "Where", event.venue.name, `${event.venue.distanceKm} km`],
              ["clock", "Duration", event.facts[0]?.[1] ?? "—", `Doors at ${event.facts[1]?.[1] ?? "—"}`],
              ["globe", "Language", event.facts[2]?.[1] ?? "—", event.facts[3]?.[1] ?? "—"],
            ].map(([iconName, label, value, sub], i, arr) => (
              <div
                key={label}
                className={
                  "p-4 " +
                  (i < arr.length - 1 ? "border-r border-line" : "")
                }
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-ink-3">
                  <Icon name={iconName} size={14} />
                  <span className="text-label">{label}</span>
                </div>
                <div className="text-[15px] font-semibold">{value}</div>
                <div className="mt-0.5 font-mono text-[11px] text-ink-3">{sub}</div>
              </div>
            ))}
          </Card>

          {/* Tabs */}
          <div>
            <div className="flex gap-6 border-b border-line">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  className={
                    "-mb-px border-b-2 py-2.5 text-[14px] " +
                    (i === 0
                      ? "border-accent font-medium text-ink"
                      : "border-transparent text-ink-3 hover:text-ink")
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="py-5">
              <h2 className="text-h2">About this show</h2>
              <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-2">
                {event.longDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.amenities.map((a) => (
                  <Chip key={a} size="sm">
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Lineup */}
          <div>
            <div className="mb-3.5 flex items-end justify-between">
              <h2 className="text-h2">Lineup</h2>
              <span className="font-mono text-[11px] text-ink-3">
                {event.lineup.length} artists · set times below
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {event.lineup.map((a) => (
                <Card
                  key={a.name}
                  className="flex min-w-[240px] flex-1 items-center gap-3 p-3.5"
                  flat
                >
                  <Avatar src={a.photo} size={48} />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-semibold">{a.name}</span>
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
              ))}
            </div>
          </div>

          {/* Venue placeholder */}
          <div>
            <h2 className="text-h2 mb-3.5">Venue</h2>
            <Card className="grid grid-cols-2 overflow-hidden p-0">
              <div className="relative h-[220px] bg-[#e8e6e2]">
                {/* Lightweight static map placeholder — Phase 2 wiring will
                    swap this for a real Mapbox tile or a Supabase-cached snapshot. */}
                <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full">
                  <path
                    d="M0,100 L400,80 M0,140 L400,120 M180,0 L200,220"
                    stroke="#d4d2cc"
                    strokeWidth="2"
                  />
                  <circle cx="200" cy="110" r="10" fill="var(--color-accent)" />
                  <circle cx="200" cy="110" r="18" fill="var(--color-accent)" fillOpacity="0.2" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5 p-5">
                <span className="text-label">VENUE</span>
                <span className="text-[16px] font-semibold">{event.venue.name}</span>
                <span className="font-mono text-[12px] text-ink-3">
                  Shahibaug · {event.venue.distanceKm} km from city centre
                </span>
                <Divider className="my-3" />
                <Button variant="default" size="sm" className="self-start">
                  <Icon name="map" size={14} /> Open in maps
                </Button>
              </div>
            </Card>
          </div>

          {/* Organizer */}
          <Card className="flex items-center gap-3 p-4">
            <Avatar src={event.organizer.photo} size={48} />
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{event.organizer.name}</span>
                {event.organizer.verified && (
                  <Chip variant="accent" size="sm">
                    Verified
                  </Chip>
                )}
              </div>
              <span className="font-mono text-[11px] text-ink-3">
                {formatDesktopOrganizerStats(event.organizer)}
              </span>
            </div>
            <Button variant="default" size="sm">
              Follow organizer
            </Button>
          </Card>
        </div>

        {/* ── Right column: sticky checkout panel ─────────── */}
        <aside className="sticky top-6 self-start">
          <Card className="p-5">
            <div className="text-label">FROM</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-mono text-[36px] font-semibold leading-none">
                {formatPrice(event.fromPriceMinor)}
              </span>
              <span className="font-mono text-[12px] text-ink-3">/ ticket</span>
            </div>

            <Divider className="my-4" />

            <div className="text-label mb-2">Pick a ticket</div>
            <ul className="flex flex-col gap-2">
              {event.ticketTypes.map((t) => {
                const soldOut = t.remaining === 0;
                const scarcity = soldOut ? null : formatScarcityLabel(t.remaining);
                return (
                  <li key={t.id}>
                    <button
                      disabled={soldOut}
                      className={
                        "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors " +
                        (soldOut
                          ? "cursor-not-allowed border-line bg-surface opacity-50"
                          : "border-line hover:border-line-2")
                      }
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[14px] font-semibold">{t.name}</span>
                        {t.description && (
                          <span className="font-mono text-[11px] text-ink-3">
                            {t.description}
                          </span>
                        )}
                        {scarcity && (
                          <span className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-accent">
                            {scarcity}
                          </span>
                        )}
                        {soldOut && (
                          <span className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-ink-3">
                            Sold out
                          </span>
                        )}
                      </div>
                      <span
                        className={
                          "font-mono text-[14px] font-semibold " +
                          (soldOut ? "line-through" : "")
                        }
                      >
                        {formatPrice(t.priceMinor)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Link
              href={`/events/${event.id}/checkout`}
              className="mt-5 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3 text-[14px] font-semibold text-white hover:opacity-90"
            >
              Continue <Icon name="arrowR" size={14} />
            </Link>

            <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-ink-3">
              <Icon name="check" size={12} className="text-success" />
              Free transfer · partial refund · QR + wallet
            </div>
            <Link
              href={event.supportUrl ?? "/help"}
              className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-ink-3 hover:text-ink"
            >
              Need help? Contact support →
            </Link>
          </Card>

          {/* Friends going - lightweight */}
          {event.goingFriends.count > 0 && (
          <Card className="mt-3 flex items-center gap-3 p-3.5" flat>
            <Avatar src={event.goingFriends.photos[0]} size={28} />
            <Avatar src={event.goingFriends.photos[1]} size={28} className="-ml-3" />
            <Avatar src={event.goingFriends.photos[2]} size={28} className="-ml-3" />
            <span className="flex-1 text-[12px]">
              <span className="font-semibold">{event.goingFriends.count} friends</span>
              <span className="text-ink-3"> going</span>
            </span>
            <button className="text-[12px] font-medium text-accent">View</button>
          </Card>
          )}

          {/* Accepted payment methods */}
          <Card className="mt-3 p-3.5" flat>
            <div className="text-label mb-2">Accepted here</div>
            <div className="flex items-center gap-1.5">
              <DesktopPaymentTile label="Visa" tone="navy" />
              <DesktopPaymentTile label="Mcard" tone="navy" />
              <DesktopPaymentTile label="MTN" tone="amber" />
              <DesktopPaymentTile label="EFT" tone="warm" />
            </div>
          </Card>

          {/* Refund + transfer assurance */}
          <Card className="mt-3 p-3.5" flat>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
              <Icon name="check" size={14} className="text-success" />
              Buyer assurance
            </div>
            <ul className="flex flex-col gap-1.5 text-[12px]">
              <li className="flex items-start gap-2">
                <Icon name="check" size={12} className="mt-1 shrink-0 text-success" />
                <span>
                  <span className="font-semibold">Refund window</span>{" "}
                  <span className="text-ink-3">per organizer policy</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" size={12} className="mt-1 shrink-0 text-success" />
                <span>
                  <span className="font-semibold">Free transfer</span>{" "}
                  <span className="text-ink-3">to friends before doors</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" size={12} className="mt-1 shrink-0 text-success" />
                <span>
                  <span className="font-semibold">QR + wallet entry</span>{" "}
                  <span className="text-ink-3">offline-ready</span>
                </span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function formatDesktopOrganizerStats(o: DesktopEventData["organizer"]): string {
  const parts = [`@${o.handle}`];
  if (o.eventsHosted > 0) {
    parts.push(`${o.eventsHosted} event${o.eventsHosted === 1 ? "" : "s"} hosted`);
  }
  if (o.rating > 0) parts.push(`★ ${o.rating.toFixed(1)}`);
  return parts.join(" · ");
}

function DesktopPaymentTile({
  label,
  tone,
}: {
  label: string;
  tone: "navy" | "amber" | "warm";
}) {
  const cls =
    tone === "navy"
      ? "bg-[#1a1f71] text-white"
      : tone === "amber"
      ? "bg-[#ffcc00] text-ink"
      : "bg-gradient-to-br from-[#ff5f00] to-[#f79e1b] text-white";
  return (
    <span
      className={
        "inline-flex h-[26px] min-w-[44px] items-center justify-center rounded px-2 font-mono text-[10px] font-bold tracking-wider " +
        cls
      }
    >
      {label}
    </span>
  );
}

function DesktopTrustRow({ event }: { event: DesktopEventData }) {
  const goingLabel = formatGoingCount(event.attendeeCount ?? event.goingFriends.count);
  const soldLabel = formatSoldCount(event.soldCount);
  const recent = formatRecentSoldLabel(event.recentSoldCount, {
    windowLabel: event.recentSoldWindow,
  });
  const verified = event.organizer.verified;
  if (!goingLabel && !soldLabel && !recent && !verified) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {verified && (
        <Chip variant="accent" size="sm">
          <Icon name="check" size={11} strokeWidth={3} /> Verified organizer
        </Chip>
      )}
      {goingLabel && <Chip size="sm">{goingLabel}</Chip>}
      {soldLabel && <Chip size="sm">{soldLabel}</Chip>}
      {recent && (
        <span className="font-mono text-[11px] text-ink-3">
          <span className="text-accent">●</span> {recent}
        </span>
      )}
    </div>
  );
}
