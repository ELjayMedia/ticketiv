import type { ClaimedDeviceSetup, OrganizerRole, OrganizerSection } from "@ticketiv/shared";

/**
 * Client for the Ticketiv Organizer mobile API (/api/mobile/organizer/*).
 * Every call sends the signed-in person's access token; the server checks the
 * same role rules as the web workspace.
 */

export type OrganizerApiConfig = {
  baseUrl: string;
  fetch: typeof fetch;
  /** Returns a fresh access token, refreshing it first when needed. */
  getAccessToken: () => Promise<string>;
};

export type OrganizerWorkspace = {
  orgId: string;
  orgName: string;
  role: OrganizerRole;
  roleLabel: string;
  sections: OrganizerSection[];
  eventIds: string[] | null;
};

export type OrganizerScanEvent = {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
};

export class OrganizerApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "OrganizerApiError";
  }

  /** The server no longer accepts this session: sign in again. */
  get unauthorized(): boolean {
    return this.status === 401;
  }
}

const ROLES: ReadonlyArray<OrganizerRole> = ["manager", "finance", "staff", "scanner"];

export function readApiError(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  return fallback;
}

export function isClaimedDeviceSetup(value: unknown): value is ClaimedDeviceSetup {
  if (!value || typeof value !== "object") return false;
  const setup = value as Partial<ClaimedDeviceSetup>;
  return Boolean(
    setup.device &&
      typeof setup.device.id === "string" &&
      setup.session &&
      typeof setup.session.id === "string" &&
      setup.event &&
      typeof setup.event.id === "string" &&
      typeof setup.event.title === "string"
  );
}

async function request(
  config: OrganizerApiConfig,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
  fallbackError = "Something went wrong."
): Promise<unknown> {
  const token = await config.getAccessToken();
  let response: Response;
  try {
    response = await config.fetch(new URL(path, config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`).toString(), {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new OrganizerApiError("Can't reach Ticketiv. Check your connection and try again.", 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new OrganizerApiError(readApiError(body, fallbackError), response.status);
  return body;
}

export function parseWorkspaces(value: unknown): OrganizerWorkspace[] {
  const list = (value as { workspaces?: unknown })?.workspaces;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item): OrganizerWorkspace[] => {
    if (!item || typeof item !== "object") return [];
    const w = item as Record<string, unknown>;
    if (typeof w.orgId !== "string" || !ROLES.includes(w.role as OrganizerRole)) return [];
    return [
      {
        orgId: w.orgId,
        orgName: typeof w.orgName === "string" ? w.orgName : "Organisation",
        role: w.role as OrganizerRole,
        roleLabel: typeof w.roleLabel === "string" ? w.roleLabel : "Member",
        sections: Array.isArray(w.sections) ? (w.sections.filter((s) => typeof s === "string") as OrganizerSection[]) : [],
        eventIds: Array.isArray(w.eventIds) ? w.eventIds.filter((id): id is string => typeof id === "string") : null,
      },
    ];
  });
}

export async function fetchOrganizerWorkspaces(config: OrganizerApiConfig): Promise<OrganizerWorkspace[]> {
  return parseWorkspaces(await request(config, "/api/mobile/organizer/workspaces", {}, "Unable to load your organisations."));
}

export async function fetchScanEvents(config: OrganizerApiConfig, orgId: string): Promise<OrganizerScanEvent[]> {
  const body = await request(
    config,
    `/api/mobile/organizer/events?orgId=${encodeURIComponent(orgId)}`,
    {},
    "Unable to load events."
  );
  const list = (body as { events?: unknown })?.events;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item): OrganizerScanEvent[] => {
    if (!item || typeof item !== "object") return [];
    const e = item as Record<string, unknown>;
    if (typeof e.id !== "string") return [];
    return [
      {
        id: e.id,
        title: typeof e.title === "string" ? e.title : "Untitled event",
        startsAt: typeof e.startsAt === "string" ? e.startsAt : null,
        endsAt: typeof e.endsAt === "string" ? e.endsAt : null,
        status: typeof e.status === "string" ? e.status : "",
      },
    ];
  });
}

export async function requestScannerSetup(
  config: OrganizerApiConfig,
  input: { orgId: string; eventId: string; deviceId: string | null; label: string | null }
): Promise<ClaimedDeviceSetup> {
  const body = await request(
    config,
    "/api/mobile/organizer/scanner-setup",
    { method: "POST", body: input },
    "Unable to start the scanner for this event."
  );
  if (!isClaimedDeviceSetup(body)) throw new OrganizerApiError("The scanner setup response was invalid.", 502);
  return body;
}
