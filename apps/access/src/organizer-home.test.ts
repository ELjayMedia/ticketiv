import { describe, expect, it } from "vitest";

import { orderScanEvents, organizerHomeTiles, pickWorkspace } from "./organizer-home";
import type { OrganizerWorkspace } from "./organizer-api";

const base = { orgId: "o1", orgName: "Sunset", roleLabel: "", eventIds: null } as const;
const workspace = (role: OrganizerWorkspace["role"], sections: OrganizerWorkspace["sections"]): OrganizerWorkspace => ({ ...base, role, sections });
const keys = (w: OrganizerWorkspace) => organizerHomeTiles(w, "https://ticketiv.app").map((t) => t.key);

describe("organizer home (ADR 0002 roles)", () => {
  it("gives each role the same sections as the web workspace", () => {
    expect(keys(workspace("manager", ["dashboard", "events", "series", "finance", "payouts", "team", "settings", "scan", "guestlist", "boxOffice"]))).toEqual([
      "scan", "events", "dashboard", "finance", "payouts", "series", "team", "settings",
    ]);
    expect(keys(workspace("finance", ["dashboard", "finance", "payouts"]))).toEqual(["dashboard", "finance", "payouts"]);
    expect(keys(workspace("staff", ["events", "scan", "guestlist", "boxOffice"]))).toEqual(["scan", "events"]);
    expect(keys(workspace("scanner", ["scan"]))).toEqual(["scan"]);
  });

  it("scans natively and opens the rest in the web workspace", () => {
    const tiles = organizerHomeTiles(workspace("staff", ["events", "scan"]), "https://ticketiv.app/");
    expect(tiles[0].action).toEqual({ kind: "scan" });
    expect(tiles[1]).toMatchObject({ label: "My events", action: { kind: "web", url: "https://ticketiv.app/orgs/o1/events" } });
  });

  it("reopens the last workspace", () => {
    const a = workspace("staff", ["scan"]);
    const b = { ...a, orgId: "o2" };
    expect(pickWorkspace([a, b], "o2")).toBe(b);
    expect(pickWorkspace([a, b], "gone")).toBe(a);
    expect(pickWorkspace([], null)).toBeNull();
  });

  it("orders events: tonight and upcoming first, past last", () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    const ev = (id: string, startsAt: string, status = "published") => ({ id, title: id, startsAt, endsAt: null, status });
    const ordered = orderScanEvents([ev("past", "2026-11-01T18:00:00Z"), ev("later", "2026-11-20T18:00:00Z"), ev("tonight", "2026-11-10T18:00:00Z"), ev("off", "2026-11-12T18:00:00Z", "cancelled")], now);
    expect(ordered.map((e) => e.id)).toEqual(["tonight", "later", "off", "past"]);
  });
});
