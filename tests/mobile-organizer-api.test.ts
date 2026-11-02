import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Ticketiv Organizer mobile API (ADR 0002): bearer-token auth, one role rule
 * shared with the web workspace, and scanner pairing only for events the
 * signed-in person may scan.
 */

const ORG = "00000000-0000-4000-8000-000000000301"
const OTHER_ORG = "00000000-0000-4000-8000-000000000302"
const EVENT = "00000000-0000-4000-8000-000000000401"
const OTHER_EVENT = "00000000-0000-4000-8000-000000000402"

type Row = Record<string, unknown>

const state = vi.hoisted(() => ({
  users: {} as Record<string, { id: string; email: string }>,
  tables: {} as Record<string, Row[]>,
  createSetup: vi.fn(),
  claimSetup: vi.fn(),
}))

/** Minimal PostgREST-ish query builder over in-memory rows (eq / neq / in filters). */
function query(table: string) {
  const filters: Array<(row: Row) => boolean> = []
  const read = (row: Row, column: string) =>
    column.split(".").reduce<unknown>((value, key) => (value as Row | undefined)?.[key], row)
  const builder: any = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    eq: (column: string, value: unknown) => (filters.push((row) => read(row, column) === value), builder),
    neq: (column: string, value: unknown) => (filters.push((row) => read(row, column) !== value), builder),
    in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(read(row, column))), builder),
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown) => resolve({ data: rows(), error: null }),
  }
  const rows = () => (state.tables[table] ?? []).filter((row) => filters.every((f) => f(row)))
  return builder
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query }) }))
vi.mock("@/lib/env-public", () => ({
  getRequiredSupabasePublicConfig: () => ({ url: "https://example.supabase.co", anonKey: "anon" }),
}))
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) =>
        state.users[token] ? { data: { user: state.users[token] }, error: null } : { data: { user: null }, error: new Error("bad jwt") },
    },
  }),
}))
vi.mock("@/lib/scanner/device-provisioning", () => ({
  createDeviceSetupCode: state.createSetup,
  claimDeviceSetupCode: state.claimSetup,
  DeviceProvisioningError: class extends Error {
    status = 400
  },
}))
vi.mock("@/lib/rate-limit", () => ({
  clientKey: () => "test",
  rateLimit: async () => ({ allowed: true }),
  tooManyRequests: () => new Response(null, { status: 429 }),
}))

import { GET as getWorkspaces } from "@/app/api/mobile/organizer/workspaces/route"
import { GET as getEvents } from "@/app/api/mobile/organizer/events/route"
import { POST as postScannerSetup } from "@/app/api/mobile/organizer/scanner-setup/route"

function signedIn(token: string, init: RequestInit & { url?: string } = {}) {
  return new Request(init.url ?? "https://ticketiv.app/api/mobile/organizer/workspaces", {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  })
}

function setup(path: string, token: string, body: unknown) {
  return signedIn(token, { url: `https://ticketiv.app${path}`, method: "POST", body: JSON.stringify(body) })
}

beforeEach(() => {
  state.users = {
    "door-token": { id: "u-door", email: "door@example.com" },
    "finance-token": { id: "u-finance", email: "money@example.com" },
    "gate-token": { id: "u-gate", email: "gate@example.com" },
  }
  state.tables = {
    org_members: [
      { org_id: ORG, user_id: "u-door", role: "organizer_staff", organizations: { name: "Sunset Collective" } },
      { org_id: ORG, user_id: "u-finance", role: "finance", organizations: { name: "Sunset Collective" } },
    ],
    event_staff: [
      { event_id: EVENT, user_id: "u-gate", role: "scanner", active: true, events: { org_id: OTHER_ORG, organizations: { name: "Laugh Lines" } } },
    ],
    admin_users: [],
    events: [
      { id: EVENT, org_id: OTHER_ORG, title: "Comedy Night", starts_at: "2026-11-20T18:00:00Z", ends_at: null, status: "published" },
      { id: OTHER_EVENT, org_id: OTHER_ORG, title: "Other show", starts_at: "2026-11-21T18:00:00Z", ends_at: null, status: "published" },
      { id: "e-sunset", org_id: ORG, title: "Sunset Sessions", starts_at: "2026-11-10T17:00:00Z", ends_at: null, status: "published" },
      { id: "e-draft", org_id: ORG, title: "Draft", starts_at: null, ends_at: null, status: "draft" },
    ],
  }
  state.createSetup.mockReset().mockResolvedValue({ code: "ABC-123" })
  state.claimSetup.mockReset().mockResolvedValue({ deviceId: "d1", eventId: EVENT })
})

describe("Ticketiv Organizer mobile API", () => {
  it("requires a valid bearer token", async () => {
    const missing = await getWorkspaces(new Request("https://ticketiv.app/api/mobile/organizer/workspaces"))
    expect(missing.status).toBe(401)
    expect((await getWorkspaces(signedIn("forged"))).status).toBe(401)
  })

  it("lists each organisation with the person's role and sections", async () => {
    const door = await (await getWorkspaces(signedIn("door-token"))).json()
    expect(door.workspaces).toEqual([
      expect.objectContaining({ orgId: ORG, role: "staff", roleLabel: "Door staff", eventIds: null, sections: ["events", "scan", "guestlist", "boxOffice"] }),
    ])

    const finance = await (await getWorkspaces(signedIn("finance-token"))).json()
    expect(finance.workspaces[0]).toMatchObject({ role: "finance", sections: ["dashboard", "finance", "payouts"] })

    const gate = await (await getWorkspaces(signedIn("gate-token"))).json()
    expect(gate.workspaces).toEqual([expect.objectContaining({ orgId: OTHER_ORG, orgName: "Laugh Lines", role: "scanner", eventIds: [EVENT] })])
  })

  it("lists only the events a person can scan, without drafts", async () => {
    const door = await (await getEvents(signedIn("door-token", { url: `https://ticketiv.app/api/mobile/organizer/events?orgId=${ORG}` }))).json()
    expect(door.events.map((e: { id: string }) => e.id)).toEqual(["e-sunset"])

    const gate = await (await getEvents(signedIn("gate-token", { url: `https://ticketiv.app/api/mobile/organizer/events?orgId=${OTHER_ORG}` }))).json()
    expect(gate.events.map((e: { id: string }) => e.id)).toEqual([EVENT])

    const finance = await getEvents(signedIn("finance-token", { url: `https://ticketiv.app/api/mobile/organizer/events?orgId=${ORG}` }))
    expect(finance.status).toBe(403)
  })

  it("pairs the phone as a scanner only for an event the person may scan", async () => {
    const ok = await postScannerSetup(setup("/api/mobile/organizer/scanner-setup", "gate-token", { orgId: OTHER_ORG, eventId: EVENT, deviceId: "d1" }))
    expect(ok.status).toBe(201)
    expect(state.createSetup).toHaveBeenCalledWith(expect.objectContaining({ orgId: OTHER_ORG, eventId: EVENT, createdBy: "u-gate" }))
    expect(state.claimSetup).toHaveBeenCalledWith(expect.objectContaining({ code: "ABC-123", deviceId: "d1" }))

    const unassigned = await postScannerSetup(setup("/api/mobile/organizer/scanner-setup", "gate-token", { orgId: OTHER_ORG, eventId: OTHER_EVENT }))
    expect(unassigned.status).toBe(403)

    const finance = await postScannerSetup(setup("/api/mobile/organizer/scanner-setup", "finance-token", { orgId: ORG, eventId: "e-sunset" }))
    expect(finance.status).toBe(403)

    const wrongOrg = await postScannerSetup(setup("/api/mobile/organizer/scanner-setup", "door-token", { orgId: ORG, eventId: EVENT }))
    expect(wrongOrg.status).toBe(404)
    expect(state.createSetup).toHaveBeenCalledTimes(1)
  })
})
