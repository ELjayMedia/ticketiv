import { describe, expect, it } from "vitest";

import { describeTicketivCompanion } from "./ticket-companion";
import { createTicketivWalletTicket, parseTicketivWallet, serializeTicketivWallet, createTicketivWalletState } from "./ticket-wallet";

// Sat 16 Nov 2026, 18:00 in Eswatini = 16:00Z
const START = "2026-11-16T16:00:00Z";

function ticket(overrides: Record<string, unknown> = {}) {
  return createTicketivWalletTicket({
    id: "t1",
    orderId: "o1",
    eventId: "e1",
    eventTitle: "Sunset Sessions",
    eventSlug: "sunset",
    ticketCode: "CODE",
    deliveryToken: "tok",
    ticketTypeName: "General",
    holderName: null,
    eventStartsAt: START,
    venueName: "Valley Amphitheatre",
    venueAddress: "Ezulwini",
    coverImageUrl: null,
    checkedInAt: null,
    revokedAt: null,
    refundedAt: null,
    priceCents: 25000,
    companion: {
      timeZone: "Africa/Mbabane",
      endsAt: "2026-11-16T21:00:00Z",
      orgName: "Sunset Collective",
      guide: {
        doorsOpenAt: "2026-11-16T15:30:00Z",
        entrance: "Gate 2",
        parking: "Free on site",
        programme: [
          { time: "17:30", title: "Gates open" },
          { time: "18:00", title: "DJ Nala", where: "Main stage" },
          { time: "bad", title: "dropped" },
        ],
        facilities: [{ label: "Toilets", detail: "Behind the VIP deck" }],
      },
      updates: [{ id: "u1", title: "Gates open earlier", body: null, createdAt: "2026-11-16T10:00:00Z" }],
    },
    ...overrides,
  });
}

describe("describeTicketivCompanion", () => {
  it("shows the countdown and getting there before the day", () => {
    const view = describeTicketivCompanion(ticket(), Date.parse("2026-11-07T10:00:00Z"))!;
    expect(view.stage).toBe("booked");
    expect(view.countdown).toBe("IN 9 DAYS");
    expect(view.facts[0]).toEqual({ label: "SHOW AT", value: "Gate 2" });
    expect(view.facts[1]).toEqual({ label: "DOORS", value: "17:30" });
    expect(view.gettingThere.map((g) => g.label)).toEqual(["VENUE", "PARKING"]);
    expect(view.programme).toHaveLength(2);
    expect(view.updates[0].whenLabel).toBe("16 NOV, 12:00");
  });

  it("marks what is on now on the day, in the event's zone", () => {
    const view = describeTicketivCompanion(ticket(), Date.parse("2026-11-16T16:10:00Z"))!; // 18:10 local
    expect(view.stage).toBe("today");
    expect(view.programme.map((p) => p.current)).toEqual([false, true]);
  });

  it("moves to 'in' only with a recorded scan, and to 'after' once ended", () => {
    const inView = describeTicketivCompanion(ticket({ checkedInAt: "2026-11-16T15:45:00Z" }), Date.parse("2026-11-16T16:10:00Z"))!;
    expect(inView.stage).toBe("in");
    expect(inView.headline).toBe("You're in · 17:45");
    expect(inView.gettingThere).toEqual([]);
    expect(inView.notesTitle).toBe("Good to know");
    expect(describeTicketivCompanion(ticket(), Date.parse("2026-11-17T06:00:00Z"))!.stage).toBe("after");
  });

  it("shows the event memory only after the event", () => {
    const memory = { orgId: "o1", following: false, myRating: null, highlights: [], suggestions: [{ slug: "next", title: "Next one", whenLabel: "SAT 14 DEC", reason: "More from Sunset Collective" }] };
    const withMemory = ticket({ companion: { ...ticket().companion, memory } });
    expect(describeTicketivCompanion(withMemory, Date.parse("2026-11-16T16:10:00Z"))!.memory).toBeNull();
    const after = describeTicketivCompanion(withMemory, Date.parse("2026-11-17T06:00:00Z"))!;
    expect(after.memory?.suggestions[0].slug).toBe("next");
    expect(after.facts).toEqual([]);
    expect(after.programme).toEqual([]);
    expect(after.headline).toBe("Event ended");
  });

  it("returns nothing for tickets saved before the companion existed", () => {
    expect(describeTicketivCompanion(ticket({ companion: undefined }))).toBeNull();
  });

  it("keeps the companion through a wallet save and reload (offline)", () => {
    const wallet = createTicketivWalletState({ tickets: [ticket()] });
    const parsed = parseTicketivWallet(serializeTicketivWallet(wallet));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.wallet.tickets[0].companion?.guide?.entrance).toBe("Gate 2");
  });
});
