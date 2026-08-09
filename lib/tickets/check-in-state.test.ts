import { describe, expect, it } from "vitest"

import { findNewTicketCheckIns } from "@/lib/tickets/check-in-state"

describe("findNewTicketCheckIns", () => {
  it("returns only newly checked-in tickets", () => {
    const known = new Set(["already-seen"])

    expect(
      findNewTicketCheckIns(
        [
          { order_item_id: "unchecked", checked_in_at: null },
          { order_item_id: "already-seen", checked_in_at: "2026-08-09T14:20:00.000Z" },
          { order_item_id: "new-check-in", checked_in_at: "2026-08-09T14:22:00.000Z" },
        ],
        known,
      ),
    ).toEqual([
      { ticketId: "new-check-in", checkedInAt: "2026-08-09T14:22:00.000Z" },
    ])
  })

  it("deduplicates repeated rows from realtime and fallback polling", () => {
    expect(
      findNewTicketCheckIns(
        [
          { order_item_id: "ticket-1", checked_in_at: "2026-08-09T14:22:00.000Z" },
          { order_item_id: "ticket-1", checked_in_at: "2026-08-09T14:22:00.000Z" },
        ],
        new Set(),
      ),
    ).toHaveLength(1)
  })
})
