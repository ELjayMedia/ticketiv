import Link from "next/link";
import { notFound } from "next/navigation";
import { eventTimeZone, formatEventClock, formatInTimeZone } from "@ticketiv/shared";

import { Card } from "@/components/quiet/ui/card";
import { mapGuide } from "@/lib/data/companion";
import { canViewTicketHolderGuide } from "@/lib/guest-companion";
import { MyTicketsViewSchema } from "@/lib/schemas/views";
import { createAdminClient } from "@/lib/supabase/admin";
import { ticketDisplayStatus } from "@/lib/ticket-status";
import { verifyTicketToken } from "@/lib/ticket-tokens";
import { TokenRecoveryScreen } from "@/components/quiet/screens/tickets/token-recovery";

export const metadata = { title: "Prepare for your event", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Guest-friendly, view-only Event Companion. The proof of possession is a
 * short-lived /t ticket capability, NOT an event ID, email address or order ID.
 * Reads are restricted to the token's order_item_id before ANY event queries.
 * This route does not expose the signed-in social or mutation controls.
 */
export default async function GuestEventCompanionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyTicketToken(token);
  if (!verified.ok) return <TokenRecoveryScreen reason={verified.reason} />;

  const admin = createAdminClient();
  const { data: raw, error } = await admin
    .from("v_my_tickets")
    .select("*")
    .eq("order_item_id", verified.orderItemId)
    .maybeSingle();
  if (error) throw error;
  const parsed = MyTicketsViewSchema.safeParse(raw);
  if (!parsed.success) notFound();

  const ticket = parsed.data;
  const status = ticketDisplayStatus(ticket);
  const live = canViewTicketHolderGuide(status);
  if (!live) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-5 py-10">
        <Link href={`/t/${token}`} className="text-[13px] font-semibold text-accent">← Back to ticket</Link>
        <Card className="p-5">
          <h1 className="text-h2">This ticket is no longer active</h1>
          <p className="mt-2 text-[13px] text-ink-3">Event updates and entry guidance are available only to current ticket holders. Check the ticket status or contact Ticketiv support.</p>
        </Card>
      </main>
    );
  }

  const [eventRes, guideRes, updatesRes] = await Promise.all([
    admin.from("events").select("tz, organizations(name), venues(tz)").eq("id", ticket.event_id).maybeSingle(),
    admin.from("event_guides").select("*").eq("event_id", ticket.event_id).maybeSingle(),
    admin.from("event_updates")
      .select("id, title, body, created_at")
      .eq("event_id", ticket.event_id)
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const guide = mapGuide(guideRes.data);
  const zone = eventTimeZone(eventRes.data?.tz, eventRes.data?.venues?.tz);
  const when = ticket.event_starts_at
    ? `${formatInTimeZone(ticket.event_starts_at, { weekday: "short", day: "numeric", month: "short" }, zone)} · ${formatEventClock(ticket.event_starts_at, zone)}`
    : "Date to be confirmed";
  const directions = [ticket.venue_name, ticket.venue_address, ticket.city].filter(Boolean).join(", ");
  const updates = updatesRes.data ?? [];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-5 py-8">
      <Link href={`/t/${token}`} className="text-[13px] font-semibold text-accent">← Back to your ticket</Link>
      <div className="flex flex-col gap-1">
        <p className="text-label">Your Event Companion</p>
        <h1 className="text-h1">{ticket.event_title}</h1>
        <p className="text-[13px] text-ink-3">{when} · {ticket.venue_name ?? "Venue to be confirmed"}</p>
      </div>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-[14px] font-semibold">Ready for the door</p>
        <p className="text-[13px] leading-relaxed text-ink-3">Open your ticket now and save it for offline entry before arriving at the venue.</p>
        <Link href={`/t/${token}`} className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-accent px-4 py-2 text-[14px] font-semibold text-white">View my ticket</Link>
        {guide?.doorsOpenAt && <p className="text-[13px]"><strong>Doors:</strong> {formatEventClock(guide.doorsOpenAt, zone)}</p>}
        {guide?.entrance && <p className="text-[13px]"><strong>Entrance:</strong> {guide.entrance}</p>}
      </Card>
      {updates.length > 0 && <section className="flex flex-col gap-2">
        <h2 className="text-h2">Official updates</h2>
        <Card className="divide-y divide-line px-4">
          {updates.map(update => <div key={update.id} className="py-3">
            <p className="text-[14px] font-semibold">{update.title}</p>
            {update.body && <p className="mt-1 text-[13px] text-ink-3">{update.body}</p>}
          </div>)}
        </Card>
      </section>}
      {guide && <section className="flex flex-col gap-2">
        <h2 className="text-h2">Plan your day</h2>
        <Card className="flex flex-col gap-3 p-4">
          {([["Getting there", guide.gettingThere], ["Parking", guide.parking], ["What to bring", guide.whatToBring], ["Age policy", guide.ageRule], ["Payments", guide.paymentNote], ["House rules", guide.houseRules], ["Need assistance?", guide.helpContact]] as const)
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => <div key={label}><p className="text-label">{label}</p><p className="mt-1 text-[13px]">{value}</p></div>)}
          {guide.programme.length > 0 && <>
            <p className="text-[14px] font-semibold">Programme</p>
            {guide.programme.map((item, i) => (
              <div key={`${i}-${item.time}`} className="flex gap-3 text-[13px]">
                <span className="w-12 shrink-0 font-mono">{item.time}</span>
                <span><strong>{item.title}</strong>{item.where ? ` · ${item.where}` : ""}</span>
              </div>
            ))}
          </>}
        </Card>
      </section>}
      {directions && <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directions)}`}
        target="_blank" rel="noreferrer noopener" referrerPolicy="no-referrer"
        className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-line-2 px-4 text-[14px] font-semibold"
      >Get directions</a>}
      <p className="text-[11px] text-ink-3">This secure link is view-only. Sign in to manage transfers, refunds and notifications.</p>
    </main>
  );
}
