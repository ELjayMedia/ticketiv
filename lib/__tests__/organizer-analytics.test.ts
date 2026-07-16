import { describe, expect, it } from "vitest"

import { aggregateEventSalesMetrics } from "@/lib/data/organizer/analytics"

describe("organizer analytics", () => {
  it("aggregates event sales from org-scoped daily metrics", () => {
    expect(
      aggregateEventSalesMetrics([
        { event_id: "event-1", tickets_sold: 2, gross_revenue_cents: 4000 },
        { event_id: "event-2", tickets_sold: 1, gross_revenue_cents: 2500 },
        { event_id: "event-1", tickets_sold: 3, gross_revenue_cents: 6000 },
      ]),
    ).toEqual([
      {
        event_id: "event-1",
        tickets_sold: 5,
        tickets_issued: 5,
        paid_orders: null,
        gross_cents: 10000,
      },
      {
        event_id: "event-2",
        tickets_sold: 1,
        tickets_issued: 1,
        paid_orders: null,
        gross_cents: 2500,
      },
    ])
  })
})
