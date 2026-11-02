import { describe, expect, it, vi } from "vitest";

import {
  OrganizerApiError,
  fetchOrganizerWorkspaces,
  fetchScanEvents,
  parseWorkspaces,
  requestScannerSetup,
} from "./organizer-api";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function api(response: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(response);
  return {
    fetchMock,
    config: { baseUrl: "https://ticketiv.app", fetch: fetchMock as unknown as typeof fetch, getAccessToken: async () => "token-1" },
  };
}

const setup = {
  device: { id: "d1", label: "Gate", deviceRole: "organizer_scanner", maxScansPerMinute: null },
  session: { id: "s1", deviceId: "d1", startedAt: "2026-11-02T00:00:00Z" },
  event: { id: "e1", title: "Sunset Sessions", startsAt: null, orgId: "o1" },
};

describe("organizer mobile API client", () => {
  it("sends the access token and reads workspaces", async () => {
    const { config, fetchMock } = api(async () =>
      json(200, {
        workspaces: [
          { orgId: "o1", orgName: "Sunset", role: "staff", roleLabel: "Door staff", sections: ["events", "scan"], eventIds: null },
          { orgId: "o2", role: "owner" },
        ],
      })
    );
    const workspaces = await fetchOrganizerWorkspaces(config);
    expect(workspaces).toEqual([
      { orgId: "o1", orgName: "Sunset", role: "staff", roleLabel: "Door staff", sections: ["events", "scan"], eventIds: null },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ticketiv.app/api/mobile/organizer/workspaces");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer token-1");
  });

  it("ignores malformed workspace payloads", () => {
    expect(parseWorkspaces(null)).toEqual([]);
    expect(parseWorkspaces({ workspaces: [null, { orgId: 1, role: "manager" }] })).toEqual([]);
  });

  it("lists scan events for an organisation", async () => {
    const { config, fetchMock } = api(async () => json(200, { events: [{ id: "e1", title: "Show", startsAt: null, endsAt: null, status: "published" }] }));
    await expect(fetchScanEvents(config, "o 1")).resolves.toEqual([{ id: "e1", title: "Show", startsAt: null, endsAt: null, status: "published" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://ticketiv.app/api/mobile/organizer/events?orgId=o%201");
  });

  it("pairs the scanner and validates the response", async () => {
    const ok = api(async () => json(201, setup));
    await expect(requestScannerSetup(ok.config, { orgId: "o1", eventId: "e1", deviceId: null, label: null })).resolves.toEqual(setup);
    expect(JSON.parse(String(ok.fetchMock.mock.calls[0][1]?.body))).toEqual({ orgId: "o1", eventId: "e1", deviceId: null, label: null });

    const bad = api(async () => json(201, { nope: true }));
    await expect(requestScannerSetup(bad.config, { orgId: "o1", eventId: "e1", deviceId: null, label: null })).rejects.toBeInstanceOf(OrganizerApiError);
  });

  it("surfaces server errors and flags expired sessions", async () => {
    const { config } = api(async () => json(401, { error: "Sign in again to continue" }));
    const error = await fetchOrganizerWorkspaces(config).catch((e) => e);
    expect(error).toBeInstanceOf(OrganizerApiError);
    expect(error.message).toBe("Sign in again to continue");
    expect(error.unauthorized).toBe(true);

    const offline = api(async () => { throw new TypeError("offline"); });
    await expect(fetchOrganizerWorkspaces(offline.config)).rejects.toMatchObject({ status: 0 });
  });
});
