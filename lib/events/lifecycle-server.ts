import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { deriveEventLifecycle, type EventLifecycleState } from "@/lib/events/lifecycle";

export interface EventTransactionLifecycle {
  publicationStatus: string;
  lifecycle: EventLifecycleState;
  startsAt: string | null;
  endsAt: string | null;
}

export async function getEventTransactionLifecycle(eventId: string): Promise<EventTransactionLifecycle | null> {
  const admin = createAdminClient();

  const [{ data: event, error: eventError }, { data: finalOccurrence, error: dateError }] = await Promise.all([
    admin
      .from("events")
      .select("id, status, starts_at, ends_at")
      .eq("id", eventId)
      .maybeSingle(),
    admin
      .from("event_dates")
      .select("starts_at, ends_at")
      .eq("event_id", eventId)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (eventError) {
    console.error("[event-lifecycle] failed to load event", { eventId, code: eventError.code });
    return null;
  }
  if (dateError) {
    console.error("[event-lifecycle] failed to load final occurrence", { eventId, code: dateError.code });
  }
  if (!event) return null;

  const startsAt = finalOccurrence?.starts_at ?? event.starts_at ?? null;
  const endsAt = finalOccurrence?.ends_at ?? finalOccurrence?.starts_at ?? event.ends_at ?? event.starts_at ?? null;

  return {
    publicationStatus: String(event.status ?? ""),
    lifecycle: deriveEventLifecycle({
      status: String(event.status ?? ""),
      eventStartsAt: startsAt,
      eventEndsAt: endsAt,
    }),
    startsAt,
    endsAt,
  };
}

export async function assertEventTransactionsOpen(eventId: string): Promise<EventTransactionLifecycle> {
  const state = await getEventTransactionLifecycle(eventId);
  if (!state) throw new Error("Event not found.");

  if (state.publicationStatus !== "published") {
    throw new Error("Ticket sales are not available for this event.");
  }
  if (state.lifecycle === "ended") {
    throw new Error("This event has ended. Ticket sales are closed.");
  }
  if (state.lifecycle === "cancelled") {
    throw new Error("This event has been cancelled. Ticket sales are closed.");
  }

  return state;
}
