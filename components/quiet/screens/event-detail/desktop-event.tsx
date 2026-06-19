"use client";

import * as React from "react";
import Link from "next/link";
import { createSeatHoldAction } from "@/app/(focused)/events/[id]/actions";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider, Avatar } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import {
  formatPrice,
  formatGoingCount,
  formatSoldCount,
  formatRecentSoldLabel,
  formatLineupLabel,
  formatScarcityLabel,
} from "@/lib/format";
import type { MobileEventData } from "./mobile-event";

interface DesktopEventProps {
  event?: DesktopEventData;
}

export interface DesktopEventData extends MobileEventData {
  longDescription?: string;
  amenities?: string[];
  ticketTypes?: ReadonlyArray<{
    id: string;
    name: string;
    priceMinor: number;
    remaining: number | null;
    description?: string;
  }>;
}

const TABS = ["About", "Lineup", "Venue", "Reviews", "FAQ"] as const;
type Tab = typeof TABS[number];

export function DesktopEvent({ event }: DesktopEventProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("About");
  const [followedArtists, setFollowedArtists] = React.useState<Set<string>>(new Set());
  const [followedOrganizer, setFollowedOrganizer] = React.useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = React.useState(false);

  if (!event) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[720px] items-center justify-center px-6">
        <Card className="w-full p-8 text-center" flat>
          <h1 className="text-[22px] font-semibold text-ink">Event unavailable</h1>
          <p className="mt-2 text-[14px] text-ink-3">
            This event could not be loaded or is no longer available.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink hover:bg-bg"
          >
            Back to events
          </Link>
        </Card>
      </div>
    );
  }

  const ticketTypes = event.ticketTypes ?? [];
  const amenities = event.amenities ?? [];
  const aboutText = event.longDescription || event.description;

  function toggleArtist(name: string) {
    setFollowedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-10">
      <div className="pt-6">
        <Photo src={event.posterUrl} height={420} overlay="dim" className="rounded-2xl">
          <div className="mt-auto">
            <Chip size="sm" className="border-transparent bg-white/95 text-ink">
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

      <div className="grid grid-cols-[1fr_380px] items-start gap-8 pt-8 pb-12">
        <div className="flex flex-col gap-7">
          <DesktopTrustRow event={event} />
          <DesktopMetaGrid event={event} />

          <div>
            <div className="flex gap-6 border-b border-line">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={
                    "-mb-px border-b-2 py-2.5 text-[14px] " +
                    (t === activeTab
                      ? "border-accent font-medium text-ink"
                      : "border-transparent text-ink-3 hover:text-ink")
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTab === "About" && (
              <div className="py-5">
                <h2 className="text-h2">About this show</h2>
                {aboutText ? (
                  <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-2">
                    {aboutText}
                  </p>
                ) : (
                  <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-3">
                    More details will be added by the organizer soon.
                  </p>
                )}
                {amenities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {amenities.map((a) => (
                      <Chip key={a} size="sm">
                        {a}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "Lineup" && (
              <div className="py-5">
                <div className="mb-3.5 flex items-end justify-between">
                  <h2 className="text-h2">Lineup</h2>
                  <span className="font-mono text-[11px] text-ink-3">
                    {event.lineup.length} artist{event.lineup.length === 1 ? "" : "s"}
                  </span>
                </div>
                {event.lineup.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {event.lineup.map((a) => (
                      <Card key={a.name} className="flex min-w-[240px] flex-1 items-center gap-3 p-3.5" flat>
                        <Avatar src={a.photo} size={48} />
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[15px] font-semibold">{a.name}</span>
                            {a.headliner && <Chip variant="accent" size="sm">Headliner</Chip>}
                          </div>
                          <span className="font-mono text-[11px] text-ink-3">{a.role}</span>
                        </div>
                        <Button
                          variant={followedArtists.has(a.name) ? "accent" : "default"}
                          size="xs"
                          onClick={() => toggleArtist(a.name)}
                        >
                          {followedArtists.has(a.name) ? "Following" : "Follow"}
                        </Button>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-5 text-[13px] text-ink-3" flat>
                    Lineup to be announced.
                  </Card>
                )}
              </div>
            )}

            {activeTab === "Venue" && (
              <div className="py-5">
                <Card className="grid grid-cols-2 overflow-hidden p-0">
                  <div className="relative h-[220px] bg-[#e8e6e2]">
                    <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full">
                      <path d="M0,100 L400,80 M0,140 L400,120 M180,0 L200,220" stroke="#d4d2cc" strokeWidth="2" />
                      <circle cx="200" cy="110" r="10" fill="var(--color-accent)" />
                      <circle cx="200" cy="110" r="18" fill="var(--color-accent)" fillOpacity="0.2" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5 p-5">
                    <span className="text-label">VENUE</span>
                    <span className="text-[16px] font-semibold">{event.venue.name}</span>
                    {event.venue.distanceKm > 0 && (
                      <span className="font-mono text-[12px] text-ink-3">
                        {event.venue.distanceKm} km from city centre
                      </span>
                    )}
                    <Divider className="my-3" />
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                    >
                      <Icon name="map" size={14} /> Open in maps
                    </a>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "Reviews" && (
              <div className="py-5">
                <div className="rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center font-mono text-[11px] text-ink-3">
                  No reviews yet — be the first to rate this event after attending.
                </div>
              </div>
            )}

            {activeTab === "FAQ" && (
              <div className="py-5">
                <div className="rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center font-mono text-[11px] text-ink-3">
                  FAQ coming soon.
                </div>
              </div>
            )}
          </div>

          <Card className="flex items-center gap-3 p-4">
            <Avatar src={event.organizer.photo} size={48} />
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{event.organizer.name}</span>
                {event.organizer.verified && <Chip variant="accent" size="sm">Verified</Chip>}
              </div>
              <span className="font-mono text-[11px] text-ink-3">{formatDesktopOrganizerStats(event.organizer)}</span>
            </div>
            <Button variant={followedOrganizer ? "accent" : "default"} size="sm" onClick={() => setFollowedOrganizer((v) => !v)}>
              {followedOrganizer ? "Following" : "Follow organizer"}
            </Button>
          </Card>
        </div>

        <aside className="sticky top-6 self-start">
          {ticketTypes.length === 0 ? (
            <Card className="p-5">
              <div className="text-label">TICKETS</div>
              <div className="mt-2 text-[15px] font-semibold">Not yet on sale</div>
              <div className="mt-1 font-mono text-[11px] text-ink-3">
                The organizer hasn&apos;t opened sales for this event yet. Join the waitlist to be notified.
              </div>
              <Link href={`/waitlist?eventId=${encodeURIComponent(event.id)}`} className="mt-5 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3 text-[14px] font-semibold text-white hover:opacity-90">
                Notify me <Icon name="arrowR" size={14} />
              </Link>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="text-label">FROM</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-mono text-[36px] font-semibold leading-none">
                  {event.fromPriceMinor == null ? "—" : formatPrice(event.fromPriceMinor)}
                </span>
                <span className="font-mono text-[12px] text-ink-3">/ ticket</span>
              </div>

              <Divider className="my-4" />
              <div className="text-label mb-2">Pick a ticket</div>
              <ul className="flex flex-col gap-2">
                {ticketTypes.map((t) => {
                  const soldOut = t.remaining === 0;
                  const scarcity = soldOut ? null : formatScarcityLabel(t.remaining);
                  return (
                    <li key={t.id}>
                      <button disabled={soldOut} className={"flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors " + (soldOut ? "cursor-not-allowed border-line bg-surface opacity-50" : "border-line hover:border-line-2")}>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[14px] font-semibold">{t.name}</span>
                          {t.description && <span className="font-mono text-[11px] text-ink-3">{t.description}</span>}
                          {scarcity && <span className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-accent">{scarcity}</span>}
                          {soldOut && <span className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-ink-3">Sold out</span>}
                        </div>
                        <span className={"font-mono text-[14px] font-semibold " + (soldOut ? "line-through" : "")}>{formatPrice(t.priceMinor)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <form action={createSeatHoldAction}>
                <input type="hidden" name="eventSlug" value={event.id} />
                <input type="hidden" name="quantity" value="1" />
                <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3 text-[14px] font-semibold text-white hover:opacity-90">
                  Continue <Icon name="arrowR" size={14} />
                </button>
              </form>
            </Card>
          )}

          {event.goingFriends.count > 0 && (
            <Card className="mt-3 flex items-center gap-3 p-3.5" flat>
              {event.goingFriends.photos.slice(0, 3).map((photo, index) => (
                <Avatar key={photo} src={photo} size={28} className={index > 0 ? "-ml-3" : undefined} />
              ))}
              <span className="flex-1 text-[12px]"><span className="font-semibold">{event.goingFriends.count} friends</span><span className="text-ink-3"> going</span></span>
              <button onClick={() => setFriendsModalOpen(true)} className="text-[12px] font-medium text-accent hover:opacity-75">View</button>
            </Card>
          )}
        </aside>
      </div>

      {friendsModalOpen && (
        <FriendsGoingModal friends={event.goingFriends} eventTitle={event.title} onClose={() => setFriendsModalOpen(false)} />
      )}
    </div>
  );
}

function FriendsGoingModal({ friends, eventTitle, onClose }: { friends: DesktopEventData["goingFriends"]; eventTitle: string; onClose: () => void }) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" onClick={onClose}>
      <div className="w-full max-w-[400px] rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-elev)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Friends going · {friends.count}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-line/60">
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="mb-3 font-mono text-[11px] text-ink-3">{eventTitle}</p>
        <ul className="flex flex-col gap-3">
          {friends.photos.slice(0, friends.count).map((photo, i) => (
            <li key={photo} className="flex items-center gap-2.5">
              <Avatar src={photo} size={32} />
              <span className="text-[13px] font-semibold">{friends.names[i] ?? `Friend ${i + 1}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const META_GRID_COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" };

function DesktopMetaGrid({ event }: { event: DesktopEventData }) {
  const factsToShow = event.facts.slice(0, 4);
  const colCount = Math.min(2 + factsToShow.length, 6);
  const gridCls = META_GRID_COLS[colCount];
  const cellCls = "p-4 border-r border-line last:border-r-0";
  return (
    <Card className={`grid ${gridCls} p-0`}>
      <div className={cellCls}>
        <div className="mb-1.5 flex items-center gap-1.5 text-ink-3"><Icon name="cal" size={14} /><span className="text-label">When</span></div>
        <div className="text-[15px] font-semibold">{event.dateLabel}</div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-3">{event.timeLabel}</div>
      </div>
      <div className={cellCls}>
        <div className="mb-1.5 flex items-center gap-1.5 text-ink-3"><Icon name="pin" size={14} /><span className="text-label">Where</span></div>
        <div className="text-[15px] font-semibold">{event.venue.name}</div>
        {event.venue.distanceKm > 0 && <div className="mt-0.5 font-mono text-[11px] text-ink-3">{event.venue.distanceKm} km</div>}
      </div>
      {factsToShow.map(([label, value]) => (
        <div key={label} className={cellCls}>
          <div className="mb-1.5 flex items-center gap-1.5 text-ink-3"><span className="text-label">{label}</span></div>
          <div className="text-[15px] font-semibold">{value}</div>
        </div>
      ))}
    </Card>
  );
}

function formatDesktopOrganizerStats(o: DesktopEventData["organizer"]): string {
  const parts = [`@${o.handle}`];
  if (o.eventsHosted > 0) parts.push(`${o.eventsHosted} event${o.eventsHosted === 1 ? "" : "s"} hosted`);
  if (o.rating > 0) parts.push(`★ ${o.rating.toFixed(1)}`);
  return parts.join(" · ");
}

function DesktopTrustRow({ event }: { event: DesktopEventData }) {
  const goingLabel = formatGoingCount(event.attendeeCount ?? event.goingFriends.count);
  const soldLabel = formatSoldCount(event.soldCount);
  const recent = formatRecentSoldLabel(event.recentSoldCount, { windowLabel: event.recentSoldWindow });
  const verified = event.organizer.verified;
  if (!goingLabel && !soldLabel && !recent && !verified) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {verified && <Chip variant="accent" size="sm"><Icon name="check" size={11} strokeWidth={3} /> Verified organizer</Chip>}
      {goingLabel && <Chip size="sm">{goingLabel}</Chip>}
      {soldLabel && <Chip size="sm">{soldLabel}</Chip>}
      {recent && <span className="font-mono text-[11px] text-ink-3"><span className="text-accent">●</span> {recent}</span>}
    </div>
  );
}
