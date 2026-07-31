import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { getOrgEventKPIs } from "@/lib/adapters/kpis"

describe("organizer KPI adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("orders the dashboard's top events by the KPI view's ticket count", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          org_id: "11111111-1111-4111-8111-111111111111",
          event_id: "22222222-2222-4222-8222-222222222222",
          title: "Launch Night",
          slug: "launch-night",
          paid_orders: 2,
          tickets_issued: 3,
          tickets_checked_in: 1,
          revenue_cents: 45000,
          currency: "SZL",
        },
      ],
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const rows = await getOrgEventKPIs("11111111-1111-4111-8111-111111111111")

    expect(from).toHaveBeenCalledWith("v_event_kpis")
    expect(eq).toHaveBeenCalledWith("org_id", "11111111-1111-4111-8111-111111111111")
    expect(order).toHaveBeenCalledWith("tickets_issued", { ascending: false })
    expect(rows).toHaveLength(1)
  })
})
