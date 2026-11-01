import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { fitText, wrapText } from "@/lib/tickets/ticket-image"
import { shortTicketCode } from "@/components/tickets/ticket-print-card"
import { mapTicketView } from "@/lib/mappers/tickets"
import type { MyTicketsView } from "@/lib/schemas/views"

// One "character" = 10px keeps the measurements easy to reason about.
const measure = (text: string) => text.length * 10

describe("ticket share image text layout", () => {
  it("wraps on word boundaries within the width", () => {
    expect(wrapText(measure, "Lowveld Jazz Picnic", 120, 3)).toEqual(["Lowveld Jazz", "Picnic"])
  })

  it("ellipsises the last allowed line instead of overflowing", () => {
    const lines = wrapText(measure, "The Very Long Annual Mbabane Comedy Night Special", 160, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith("…")).toBe(true)
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(160)
  })

  it("keeps a single over-long word on its line, trimmed to fit", () => {
    const [line] = wrapText(measure, "Supercalifragilistic", 100, 2)
    expect(measure(line)).toBeLessThanOrEqual(100)
    expect(line.endsWith("…")).toBe(true)
  })

  it("leaves text that fits untouched", () => {
    expect(fitText(measure, "Eplazini", 200)).toBe("Eplazini")
  })
})

describe("ticket view data", () => {
  const row: MyTicketsView = {
    order_id: "e2dae5a1-0000-4000-8000-000000000001",
    buyer_id: "00000000-0000-4000-8000-0000000000ee",
    order_status: "paid",
    ordered_at: null,
    order_item_id: "11111111-0000-4000-8000-000000000001",
    ticket_code: "400cac09-87d4-4dba-b025-821cedfadd45",
    checked_in_at: null,
    revoked_at: null,
    ticket_type_id: null,
    ticket_type_name: "Early Bird",
    price_cents: 15000,
    currency: "SZL",
    event_id: "00000000-0000-4000-8000-000000000401",
    event_title: "Focus",
    event_slug: "focus",
    city: null,
    cover_image_url: null,
    venue_name: "Eplazini",
    venue_address: "Plot 1230",
    event_starts_at: new Date(Date.now() + 2 * 864e5).toISOString(),
    order_item_status: "issued",
    refunded_at: null,
    transferred_from_order_item_id: null,
  }

  it("shortens the ticket code shown under the QR", () => {
    expect(shortTicketCode(row.ticket_code)).toBe("400CAC09")
  })

  it("carries the holder name and no placeholder seat/doors/distance fields", () => {
    const view = mapTicketView(row, { holderName: "  Nomsa Dlamini " })
    expect(view.holderName).toBe("Nomsa Dlamini")
    expect(view).not.toHaveProperty("seatLabel")
    expect(view).not.toHaveProperty("doorsLabel")
    expect(view).not.toHaveProperty("venueDistanceKm")
    expect(mapTicketView(row).holderName).toBe("")
  })

  it("withholds the QR code for tickets that are not valid for entry", () => {
    const view = mapTicketView({ ...row, order_item_status: "transferred" })
    expect(view.isValid).toBe(false)
    expect(view.qrCode).toBe("")
  })
})

describe("ticket print contract", () => {
  const view = readFileSync(join(__dirname, "../components/quiet/screens/tickets/ticket-view.tsx"), "utf8")

  it("prints only the A5 ticket card", () => {
    expect(view).toContain("@page { size: A5 portrait")
    expect(view).toContain("TicketPrintCard")
    expect(view).toMatch(/print:hidden/)
  })

  it("shares the print layout as an image file, not the page URL", () => {
    expect(view).toContain("renderTicketImage")
    expect(view).toContain("files: [file]")
    expect(view).not.toContain("url: window.location.href")
  })
})
