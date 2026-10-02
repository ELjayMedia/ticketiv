import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("TICK-410 event lifecycle policy contract", () => {
  it("keeps default discovery current and makes past discovery explicit", () => {
    const adapter = read("lib/adapters/events.ts");
    const discoverRoute = read("app/api/discover/events/route.ts");
    const search = read("lib/data/public/search.ts");

    expect(adapter).toContain("lifecycle?: DiscoveryLifecycle");
    expect(adapter).toContain('const lifecycle = params?.lifecycle ?? "current"');
    expect(adapter).toContain('query = query.lt("event_ends_at", lifecycleCutoff)');
    expect(discoverRoute).toContain('searchParams.get("past") === "1" || when === "past"');
    expect(search).toContain('p_lifecycle: filters.lifecycle ?? "current"');
  });

  it("never uses check-in state as the source of event history", () => {
    const tickets = read("lib/mappers/tickets.ts");

    expect(tickets).toContain("Event history is schedule-driven");
    expect(tickets).toContain("eventEndsAt: row.event_ends_at");
    expect(tickets).not.toContain('ticketDisplayStatus(row) === "checked_in"\n    ||');
  });

  it("blocks stale transaction paths after an event ends or is cancelled", () => {
    const seatHold = read("app/(focused)/events/[id]/actions.ts");
    const checkout = read("app/(focused)/events/[id]/checkout/actions.ts");

    expect(seatHold).toContain('lifecycle === "ended" || lifecycle === "cancelled"');
    expect(checkout).toContain("assertEventTransactionsOpen(input.eventId)");
  });

  it("keeps organizer history lifecycle-based and final-occurrence aware", () => {
    const organizerPage = read("app/orgs/[orgId]/events/page.tsx");
    const filters = read("app/orgs/[orgId]/events/events-filter-bar.tsx");

    expect(filters).toContain('{ value: "active", label: "Active" }');
    expect(filters).toContain('{ value: "upcoming", label: "Upcoming" }');
    expect(filters).toContain('{ value: "past", label: "Past" }');
    expect(filters).toContain('{ value: "draft", label: "Draft" }');
    expect(organizerPage).toContain('from("event_dates")');
    expect(organizerPage).toContain("resolveOrganizerEventLifecycle");
    expect(organizerPage).toContain("lifecycleMap.get(event.id) === statusFilter");
  });

  it("models cancellation separately from publishing status", () => {
    const migration = read("supabase/migrations/20260927121000_tick410_public_event_lifecycle.sql");

    expect(migration).toContain("cancelled_at timestamptz");
    expect(migration).toContain("if p_new_status = 'cancelled' then");
    expect(migration).not.toMatch(/alter type[\s\S]*add value/i);
  });
});
