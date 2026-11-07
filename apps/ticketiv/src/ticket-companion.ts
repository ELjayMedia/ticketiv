import {
  companionCountdown,
  companionStage,
  currentProgrammeIndex,
  formatEventClock,
  formatInTimeZone,
  type CompanionStage,
} from "@ticketiv/shared";

import type { TicketivWalletTicket } from "./ticket-wallet";

/**
 * The Event Companion on a saved ticket, ready for the native ticket screen.
 * Works from what is stored on the device, so it needs no signal at the gate.
 * Same stage rule as the web companion (booked → today → in → after).
 */
export type TicketivCompanionView = {
  stage: CompanionStage;
  /** "IN 9 DAYS", "TOMORROW", "TODAY" (booked/today only). */
  countdown: string | null;
  headline: string;
  facts: Array<{ label: string; value: string }>;
  programme: Array<{ time: string; title: string; where: string | null; current: boolean }>;
  programmeTitle: string;
  gettingThere: Array<{ label: string; value: string }>;
  updates: Array<{ id: string; title: string; body: string | null; whenLabel: string }>;
  notes: Array<{ label: string; value: string }>;
  help: string | null;
  orgName: string | null;
};

export function describeTicketivCompanion(
  ticket: TicketivWalletTicket,
  now = Date.now()
): TicketivCompanionView | null {
  const companion = ticket.companion;
  if (!companion) return null;

  const zone = companion.timeZone;
  const stage = companionStage({
    startsAt: ticket.eventStartsAt,
    endsAt: companion.endsAt,
    checkedInAt: ticket.checkedInAt,
    nowMs: now,
  });
  const guide = companion.guide;
  const current = stage === "today" || stage === "in"
    ? currentProgrammeIndex(guide?.programme ?? [], now, ticket.eventStartsAt, zone)
    : -1;

  const headline =
    stage === "in"
      ? `You're in${ticket.checkedInAt ? ` · ${formatEventClock(ticket.checkedInAt, zone)}` : ""}`
      : stage === "after"
        ? "Event ended"
        : stage === "today"
          ? "Today: show this QR at the gate"
          : "You're going";

  const facts: TicketivCompanionView["facts"] = [];
  if (guide?.entrance) facts.push({ label: "SHOW AT", value: guide.entrance });
  if (guide?.doorsOpenAt) facts.push({ label: "DOORS", value: formatEventClock(guide.doorsOpenAt, zone) });
  if (guide?.ageRule) facts.push({ label: "AGES", value: guide.ageRule });
  if (guide?.paymentNote) facts.push({ label: "PAYMENT", value: guide.paymentNote });
  for (const facility of guide?.facilities ?? []) facts.push({ label: facility.label.toUpperCase(), value: facility.detail });

  const gettingThere: TicketivCompanionView["gettingThere"] = [];
  if (ticket.venueName) gettingThere.push({ label: "VENUE", value: [ticket.venueName, ticket.venueAddress].filter(Boolean).join(", ") });
  if (guide?.gettingThere) gettingThere.push({ label: "DIRECTIONS", value: guide.gettingThere });
  if (guide?.parking) gettingThere.push({ label: "PARKING", value: guide.parking });

  const notes: TicketivCompanionView["notes"] = [];
  if (guide?.whatToBring) notes.push({ label: "WHAT TO BRING", value: guide.whatToBring });
  if (guide?.houseRules) notes.push({ label: "HOUSE RULES", value: guide.houseRules });

  return {
    stage,
    countdown: stage === "booked" || stage === "today" ? companionCountdown(ticket.eventStartsAt, now, zone) : null,
    headline,
    facts,
    programme: (guide?.programme ?? []).map((item, index) => ({
      time: item.time,
      title: item.title,
      where: item.where ?? null,
      current: index === current,
    })),
    programmeTitle: stage === "in" ? "On now" : stage === "today" ? "Today" : "Running order",
    gettingThere: stage === "in" || stage === "after" ? [] : gettingThere,
    updates: companion.updates.map((update) => ({
      id: update.id,
      title: update.title,
      body: update.body,
      whenLabel: formatInTimeZone(update.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, zone).toUpperCase(),
    })),
    notes: stage === "after" ? [] : notes,
    help: guide?.helpContact ?? null,
    orgName: companion.orgName,
  };
}
