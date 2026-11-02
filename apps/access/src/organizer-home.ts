import type { OrganizerSection } from "@ticketiv/shared";

import type { OrganizerScanEvent, OrganizerWorkspace } from "./organizer-api";

/**
 * The signed-in home of Ticketiv Organizer: one tile per thing this role can
 * do (ADR 0002, same sections as the web workspace). Scanning runs natively;
 * the rest opens the organizer workspace on the web until each gets a native
 * screen, so every role can reach all of its work from the app today.
 */

export type OrganizerHomeTile = {
  key: string;
  label: string;
  description: string;
  action: { kind: "scan" } | { kind: "web"; url: string };
};

type TileSpec = { label: string; description: string; path: string | null };

const TILE_ORDER: ReadonlyArray<OrganizerSection> = [
  "scan",
  "events",
  "dashboard",
  "finance",
  "payouts",
  "series",
  "team",
  "settings",
];

const TILES: Partial<Record<OrganizerSection, TileSpec>> = {
  scan: { label: "Scan tickets", description: "Check people in at the gate. Works offline once loaded.", path: null },
  events: { label: "Events", description: "Create and manage events, tickets and orders.", path: "events" },
  dashboard: { label: "Dashboard", description: "Sales, check-ins and what needs attention.", path: "dashboard" },
  finance: { label: "Finance", description: "Revenue, fees and statements.", path: "finance" },
  payouts: { label: "Payouts", description: "Request payouts and manage payout accounts.", path: "payouts" },
  series: { label: "Series", description: "Recurring events and tours.", path: "series" },
  team: { label: "Team", description: "Invite people and set their roles.", path: "team" },
  settings: { label: "Settings", description: "Organisation profile and preferences.", path: "settings" },
};

export function organizerWorkspaceUrl(webBaseUrl: string, orgId: string, path = ""): string {
  const base = webBaseUrl.replace(/\/+$/, "");
  return `${base}/orgs/${encodeURIComponent(orgId)}${path ? `/${path}` : ""}`;
}

export function organizerHomeTiles(workspace: OrganizerWorkspace, webBaseUrl: string): OrganizerHomeTile[] {
  const allowed = new Set(workspace.sections);
  return TILE_ORDER.filter((section) => allowed.has(section)).flatMap((section) => {
    const spec = TILES[section];
    if (!spec) return [];
    // Door staff: guestlist and box office live on each event's door page.
    const doorEvents = section === "events" && workspace.role !== "manager";
    return [
      {
        key: section,
        label: doorEvents ? "My events" : spec.label,
        description: doorEvents ? "Guestlist and box office for the events you work." : spec.description,
        action:
          spec.path === null
            ? { kind: "scan" as const }
            : { kind: "web" as const, url: organizerWorkspaceUrl(webBaseUrl, workspace.orgId, spec.path) },
      },
    ];
  });
}

/** Start the app on the workspace the person used last, else the first. */
export function pickWorkspace(
  workspaces: ReadonlyArray<OrganizerWorkspace>,
  lastOrgId: string | null
): OrganizerWorkspace | null {
  return workspaces.find((w) => w.orgId === lastOrgId) ?? workspaces[0] ?? null;
}

/** Events happening now or later first (soonest first), then past ones. */
export function orderScanEvents(events: ReadonlyArray<OrganizerScanEvent>, now: number): OrganizerScanEvent[] {
  const endOf = (e: OrganizerScanEvent) => Date.parse(e.endsAt ?? e.startsAt ?? "") || Number.POSITIVE_INFINITY;
  const startOf = (e: OrganizerScanEvent) => Date.parse(e.startsAt ?? "") || Number.POSITIVE_INFINITY;
  const graceMs = 6 * 60 * 60 * 1000;
  const live = events.filter((e) => e.status !== "cancelled" && endOf(e) + graceMs >= now).sort((a, b) => startOf(a) - startOf(b));
  const past = events.filter((e) => !live.includes(e)).sort((a, b) => startOf(b) - startOf(a));
  return [...live, ...past];
}
