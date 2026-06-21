"use client";

import * as React from "react";
import Link from "next/link";
import { createSeatHoldAction } from "@/app/(focused)/events/[id]/actions";
import { toggleFavourite } from "@/app/(consumer)/favourites/actions";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider, Avatar, AvatarStack } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import {
  formatPrice,
  formatGoingCount,
  formatSoldCount,
  formatRecentSoldLabel,
  formatLineupLabel,
  formatScarcityLabel,
} from "@/lib/format";
import { ExpandableText } from "./expandable-text";

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
  fromPriceMinor: number | null;
  ticketTypes?: ReadonlyArray<{ id: string; name: string; priceMinor: number; remaining: number | null }>;
  attendeeCount?: number | null;
  soldCount?: number | null;
  recentSoldCount?: number | null;
  recentSoldWindow?: string;
  supportUrl?: string;
}

export function MobileEvent({ event }: MobileEventProps) {
  const [saved, setSaved] = React.useState(false);
  const [savingFav, setSavingFav] = React.useState(false);
  const [followedArtists, setFollowedArtists] = React.useState<Set<string>>(new Set());
  const [followedOrganizer, setFollowedOrganizer] = React.useState(false);
  const ticketTypes = event?.ticketTypes ?? [];
  const firstAvailable = ticketTypes.find((t) => t.remaining !== 0) ?? ticketTypes[0];
  const [selectedTypeId, setSelectedTypeId] = React.useState<string | undefined>(firstAvailable?.id);

  if (!event) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <Card className="max-w-sm p-6 text-center" flat>
          <h1 className="text-[18px] font-semibold text-ink">Event unavailable</h1>
          <p className="mt-2 text-[13px] text-ink-3">This event could not be loaded or is no longer available.</p>
          <Link href="/" className="mt-4 inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink hover:bg-bg">
            Back to events
          </Link>
        </Card>
      </div>
    );
  }

  function toggleArtist(name: string) {
    setFollowedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: event?.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  function handleInvite() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: `Join me at ${event?.title}!`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative">
          <Photo src={event.posterUrl} height={360} overlay="dim">
            <div className="absolute inset-x-4 top-12 flex items-start gap-2">
              <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 hover:bg-white" aria-label="Back">
                <Icon name="chevL" size={18} className="text-ink" />
              </Link>
              <span className="flex-1" />
              <button onClick={handleShare} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 hover:bg-white" aria-label="Share">
                <Icon name="share" size={18} className="text-ink" />
              </button>
              <button
                onClick={async () => {
                  if (savingFav) return;
                  const next = !saved;
                  setSaved(next);
                  setSavingFav(true);
                  const result = await toggleFavourite(event.id, next);
                  if (!result.ok) setSaved(!next);
                  setSavingFav(false);
                }}
                disabled={savingFav}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 hover:bg-white disabled:opacity-60"
                aria-label={saved ? "Unsave" : "Save"}
              >
                <Icon name="heart" size={18} className={saved ? "text-accent" : "text-ink"} />
              </button>
            </div>

            <div className="mt-auto">
              <Chip size="sm" className="border-transparent bg-white/95 text-ink">{event.category}</Chip>
              <h1 className="mt-2.5 text-[30px] font-semibold leading-tight tracking-[-0.022em] text-white">{event.title}</h1>
              <div className="mt-1 font-mono text-[12px] uppercase text-white/85">{formatLineupLabel(event.lineup.map((a) => a.name))}</div>
            </div>
          </Photo>
        </div>

        <section className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3" flat>
              <div className="text-label">When</div>
              <div className="mt-1 text-[15px] font-semibold">{event.dateLabel}</div>
              {event.timeLabel && <div className="mt-0.5 font-mono text-[11px] text-ink-3">{event.timeLabel}</div>}
            </Card>
            <Card className="p-3" flat>
              <div className="text-label">Where</div>
              <div className="mt-1 text-[15px] font-semibold">{event.venue.name}</div>
              {event.venue.distanceKm > 0 && (
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue.name)}`} target="_blank" rel="noopener noreferrer" className="mt-0.5 font-mono text-[11px] text-accent">
                  {event.venue.distanceKm} km · directions ↗
                </a>
              )}
            </Card>
          </div>
        </section>

        <TrustSignalsRow event={event} />

        <section className="px-5 pt-5">
          <h2 className="mb-3 text-h3">Lineup</h2>
          {event.lineup.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {event.lineup.map((a) => (
                <li key={a.name}>
                  <Card className="flex items-center gap-3 p-2.5" flat>
                    <Avatar src={a.photo} size={40} />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold">{a.name}</span>
                        {a.headliner && <Chip variant="accent" size="sm">Headliner</Chip>}
                      </div>
                      <span className="font-mono text-[11px] text-ink-3">{a.role}</span>
                    </div>
                    <Button variant={followedArtists.has(a.name) ? "accent" : "default"} size="xs" onClick={() => toggleArtist(a.name)}>
                      {followedArtists.has(a.name) ? "Following" : "Follow"}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card className="px-3.5 py-3" flat><span className="text-[13px] text-ink-3">Lineup to be announced.</span></Card>
          )}
        </section>

        {event.description && (
          <section className="px-5 pt-5">
            <h2 className="mb-2.5 text-h3">About</h2>
            <ExpandableText text={event.description} />
          </section>
        )}

        {event.facts.length > 0 && (
          <section className="px-5 pt-5">
            <Card className="p-3.5" flat>
              {event.facts.map(([k, v], i, arr) => (
                <div key={k} className={"flex items-center py-1.5 " + (i < arr.length - 1 ? "border-b border-line" : "")}>
                  <span className="flex-1 font-mono text-[11px] uppercase text-ink-3">{k}</span>
                  <span className="text-[13px] font-medium">{v}</span>
                </div>
              ))}
            </Card>
          </section>
        )}

        {ticketTypes.length > 0 && (
          <section className="px-5 pt-5">
            <h2 className="mb-3 text-h3">Tickets</h2>
            <ul className="flex flex-col gap-2">
              {ticketTypes.map((t) => {
                const soldOut = t.remaining === 0;
                const selected = selectedTypeId === t.id;
                const scarcity = soldOut ? null : formatScarcityLabel(t.remaining);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => !soldOut && setSelectedTypeId(t.id)}
                      className={
                        "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors " +
                        (soldOut
                          ? "cursor-not-allowed border-line bg-surface opacity-50"
                          : selected
                          ? "border-accent bg-accent-soft"
                          : "border-line hover:border-line-2")
                      }
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[14px] font-semibold">{t.name}</span>
                        {scarcity && <span className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-accent">{scarcity}</span>}
                        {soldOut && <span className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-ink-3">Sold out</span>}
                      </div>
                      <span className={"font-mono text-[14px] font-semibold " + (soldOut ? "line-through" : "")}>{formatPrice(t.priceMinor)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="px-5 pt-5">
          <Card className="flex items-center gap-3 p-3.5">
            <Avatar src={event.organizer.photo} size={44} />
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold">{event.organizer.name}</span>
                {event.organizer.verified && <Chip variant="accent" size="sm">Verified</Chip>}
              </div>
              <span className="font-mono text-[11px] text-ink-3">{formatOrganizerStats(event.organizer)}</span>
            </div>
            <Button variant={followedOrganizer ? "accent" : "default"} size="xs" onClick={() => setFollowedOrganizer((v) => !v)}>
              {followedOrganizer ? "Following" : "Follow"}
            </Button>
          </Card>
        </section>

        {event.goingFriends.count > 0 && (
          <section className="px-5 pb-6 pt-3">
            <Card className="flex items-center gap-3 p-3.5">
              <AvatarStack>{event.goingFriends.photos.slice(0, 5).map((p, i) => <Avatar key={i} src={p} size={28} />)}</AvatarStack>
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-semibold">{event.goingFriends.names.join(", ")}</span>
                <span className="font-mono text-[11px] text-ink-3">{event.goingFriends.count} friends going</span>
              </div>
              <Button variant="default" size="xs" onClick={handleInvite}>Invite</Button>
            </Card>
          </section>
        )}

        <section className="px-5 pb-6 pt-1">
          <Card className="flex items-center gap-3 p-3.5" flat>
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon name="check" size={16} /></div>
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-semibold">Need help?</span>
              <span className="font-mono text-[11px] text-ink-3">Secure checkout · refund policy · contact support</span>
            </div>
            <Link href={event.supportUrl ?? "/help"} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent">Help <Icon name="chevR" size={12} /></Link>
          </Card>
        </section>

        <div className="h-24" />
      </div>

      {event.fromPriceMinor == null ? (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-5 py-3.5 pb-7">
          <div className="flex flex-1 flex-col">
            <span className="text-[13px] font-semibold">Tickets not yet on sale</span>
            <span className="font-mono text-[11px] text-ink-3">Get a heads-up the moment they go live.</span>
          </div>
          <Link href={`/waitlist?eventId=${encodeURIComponent(event.id)}`} className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90">Notify me <Icon name="arrowR" size={16} /></Link>
        </div>
      ) : (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-5 py-3.5 pb-7">
          <div className="flex flex-col"><span className="text-label">From</span><span className="font-mono text-[20px] font-semibold leading-none">{formatPrice(event.fromPriceMinor)}</span></div>
          <form action={createSeatHoldAction} className="flex flex-1">
            <input type="hidden" name="eventSlug" value={event.id} />
            <input type="hidden" name="quantity" value="1" />
            <input type="hidden" name="ticketTypeId" value={selectedTypeId ?? ""} />
            <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90">Get tickets <Icon name="arrowR" size={16} /></button>
          </form>
        </div>
      )}
    </div>
  );
}

function formatOrganizerStats(o: MobileEventData["organizer"]): string {
  const parts = [`@${o.handle}`];
  if (o.eventsHosted > 0) parts.push(`${o.eventsHosted} event${o.eventsHosted === 1 ? "" : "s"}`);
  if (o.rating > 0) parts.push(`★ ${o.rating.toFixed(1)}`);
  return parts.join(" · ");
}

function TrustSignalsRow({ event }: { event: MobileEventData }) {
  const goingLabel = formatGoingCount(event.attendeeCount ?? event.goingFriends.count);
  const soldLabel = formatSoldCount(event.soldCount);
  const recent = formatRecentSoldLabel(event.recentSoldCount, { windowLabel: event.recentSoldWindow });
  const verified = event.organizer.verified;
  if (!goingLabel && !soldLabel && !recent && !verified) return null;

  return (
    <section className="px-5 pt-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {verified && <Chip variant="accent" size="sm"><Icon name="check" size={11} strokeWidth={3} /> Verified organizer</Chip>}
        {goingLabel && <Chip size="sm">{goingLabel}</Chip>}
        {soldLabel && <Chip size="sm">{soldLabel}</Chip>}
      </div>
      {recent && <p className="mt-2 font-mono text-[11px] text-ink-3"><span className="text-accent">●</span> {recent}</p>}
    </section>
  );
}
