import { notFound, redirect } from "next/navigation";

import { companionCountdown, companionStage, currentProgrammeIndex } from "@ticketiv/shared";

import { EventCompanion } from "@/components/quiet/screens/companion/event-companion";
import { getEventCompanion } from "@/lib/data/companion";
import { PHOTOS } from "@/lib/photos";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your event" };

const TZ = "Africa/Mbabane";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

function ago(iso: string, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return day(iso);
}

/**
 * /tickets/event/[eventId] — the Event Companion for an event the signed-in
 * person holds tickets for. Anyone else gets a 404 (no hint the event exists
 * in their account).
 */
export default async function EventCompanionPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!UUID.test(eventId)) notFound();

  const supabase = await createServerSupabaseClient();
  const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/tickets/event/${eventId}`)}`);

  const data = await getEventCompanion(eventId);
  if (!data) notFound();

  const nowMs = Date.now();
  const checkedIn = data.tickets
    .map((t) => t.checked_in_at)
    .filter((v): v is string => Boolean(v))
    .sort()[0] ?? null;
  const stage = companionStage({ startsAt: data.startsAt, endsAt: data.endsAt, checkedInAt: checkedIn, nowMs });
  const guide = data.guide;
  const venueLine = [data.venueAddress, data.city].filter(Boolean).join(", ") || null;
  const directionsQuery = [data.venueName, data.venueAddress, data.city].filter(Boolean).join(", ");

  return (
    <EventCompanion
      eventId={data.eventId}
      title={data.title}
      slug={data.slug}
      photo={data.coverImageUrl ?? PHOTOS.dj_set}
      whenLabel={data.startsAt ? `${day(data.startsAt)} · ${time(data.startsAt)}` : "Date TBA"}
      dateLabel={data.startsAt ? day(data.startsAt) : "Date TBA"}
      venueName={data.venueName}
      venueLine={venueLine}
      directionsHref={directionsQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}` : null}
      startsAt={data.startsAt}
      endsAt={data.endsAt}
      orgName={data.orgName}
      orderNumber={data.tickets[0].order_id.slice(0, 6).toUpperCase()}
      tickets={data.tickets.map((t) => ({
        id: t.order_item_id,
        code: t.ticket_code,
        typeName: t.ticket_type_name,
        checkedInAt: t.checked_in_at,
      }))}
      stage={stage}
      countdown={companionCountdown(data.startsAt, nowMs, TZ)}
      doorsLabel={guide?.doorsOpenAt ? time(guide.doorsOpenAt) : null}
      checkedInLabel={checkedIn ? time(checkedIn) : null}
      guide={
        guide
          ? {
              entrance: guide.entrance,
              gettingThere: guide.gettingThere,
              parking: guide.parking,
              ageRule: guide.ageRule,
              paymentNote: guide.paymentNote,
              whatToBring: guide.whatToBring,
              houseRules: guide.houseRules,
              helpContact: guide.helpContact,
              programme: guide.programme,
              facilities: guide.facilities,
            }
          : null
      }
      currentProgrammeIndex={currentProgrammeIndex(guide?.programme ?? [], nowMs, data.startsAt, TZ)}
      updates={data.updates.map((u) => ({
        id: u.id,
        title: u.title,
        body: u.body,
        whenLabel: `${data.orgName ?? "Organiser"} · ${ago(u.createdAt, nowMs)}`,
        isNew: nowMs - new Date(u.createdAt).getTime() < 24 * 60 * 60 * 1000,
      }))}
      friendsGoing={data.friendsGoing}
    />
  );
}
