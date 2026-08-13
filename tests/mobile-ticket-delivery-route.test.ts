import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { eq, from, maybeSingle, select, verifyTicketToken: vi.fn() }
})

vi.mock("@/lib/ticket-tokens", () => ({ verifyTicketToken: mocks.verifyTicketToken }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}))

import { GET } from "@/app/api/mobile/tickets/[token]/route"

const row = {
  order_id: "11111111-1111-4111-8111-111111111111",
  buyer_id: "22222222-2222-4222-8222-222222222222",
  order_status: "paid",
  ordered_at: "2026-08-12T20:00:00.000Z",
  order_item_id: "33333333-3333-4333-8333-333333333333",
  ticket_code: "TIV-ENTRY-001",
  checked_in_at: null,
  revoked_at: null,
  ticket_type_id: "44444444-4444-4444-8444-444444444444",
  ticket_type_name: "General",
  price_cents: 25000,
  currency: "SZL",
  event_id: "55555555-5555-4555-8555-555555555555",
  event_title: "Launch Night",
  event_slug: "launch-night",
  city: "Mbabane",
  cover_image_url: null,
  venue_name: "Arena",
  venue_address: "Main Road",
  event_starts_at: "2026-09-01T18:00:00.000Z",
  order_item_status: "issued",
  refunded_at: null,
  transferred_from_order_item_id: null,
  current_owner_id: "22222222-2222-4222-8222-222222222222",
}

describe("GET /api/mobile/tickets/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyTicketToken.mockReturnValue({
      ok: true,
      orderItemId: row.order_item_id,
      expiresAt: new Date("2026-09-08T18:00:00.000Z"),
    })
    mocks.maybeSingle.mockResolvedValue({ data: row, error: null })
  })

  it("returns one live ticket without permitting response caching", async () => {
    const response = await GET(new Request("https://ticketiv.app/api/mobile/tickets/token-1"), {
      params: Promise.resolve({ token: "token-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0")
    expect(mocks.eq).toHaveBeenCalledWith("order_item_id", row.order_item_id)
    expect(body.ticket).toMatchObject({
      id: row.order_item_id,
      deliveryToken: "token-1",
      ticketCode: "TIV-ENTRY-001",
      status: "issued",
    })
  })

  it("returns 410 for an expired capability without querying Supabase", async () => {
    mocks.verifyTicketToken.mockReturnValue({ ok: false, reason: "expired" })
    const response = await GET(new Request("https://ticketiv.app/api/mobile/tickets/expired"), {
      params: Promise.resolve({ token: "expired" }),
    })

    expect(response.status).toBe(410)
    expect(mocks.from).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ error: "link_expired" })
  })

  it("returns 503 when ticket signing is not configured", async () => {
    mocks.verifyTicketToken.mockReturnValue({ ok: false, reason: "missing_secret" })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const response = await GET(new Request("https://ticketiv.app/api/mobile/tickets/token-1"), {
      params: Promise.resolve({ token: "token-1" }),
    })

    expect(response.status).toBe(503)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(mocks.from).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ error: "ticket_unavailable" })
    errorSpy.mockRestore()
  })

  it("fails closed when the scoped ticket is absent", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    const response = await GET(new Request("https://ticketiv.app/api/mobile/tickets/missing"), {
      params: Promise.resolve({ token: "missing" }),
    })
    expect(response.status).toBe(404)
  })

  it("withholds a usable QR payload when live state is revoked", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ...row,
        order_item_status: "revoked",
        revoked_at: "2026-08-13T00:00:00.000Z",
      },
      error: null,
    })
    const response = await GET(new Request("https://ticketiv.app/api/mobile/tickets/revoked"), {
      params: Promise.resolve({ token: "revoked" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ticket.status).toBe("revoked")
    expect(body.ticket.ticketCode).toBe("NOT_VALID_FOR_ENTRY")
  })

  it("does not turn a Supabase read failure into a missing ticket", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: new Error("database unavailable") })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const response = await GET(new Request("https://ticketiv.app/api/mobile/tickets/token-1"), {
      params: Promise.resolve({ token: "token-1" }),
    })
    expect(response.status).toBe(503)
    errorSpy.mockRestore()
  })
})
