import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  DEFAULT_TICKET_CURRENCY,
  isSupportedTicketCurrency,
  normalizeTicketCurrency,
} from "@/lib/payments/ticket-currency"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Paystack ticket currency policy", () => {
  it("defaults new ticket pricing to ZAR", () => {
    expect(DEFAULT_TICKET_CURRENCY).toBe("ZAR")
    expect(normalizeTicketCurrency(undefined)).toBe("ZAR")
    expect(normalizeTicketCurrency(" zar ")).toBe("ZAR")
  })

  it("keeps the two deliberately supported launch currencies explicit", () => {
    expect(isSupportedTicketCurrency("ZAR")).toBe(true)
    expect(isSupportedTicketCurrency("SZL")).toBe(true)
    expect(isSupportedTicketCurrency("USD")).toBe(false)
  })

  it("uses an explicit currency selector in the event wizard", () => {
    const wizard = read("components/event-wizard/steps/TicketsStep.tsx")

    expect(wizard).toContain("Paystack payments use ZAR")
    expect(wizard).toContain("TICKET_CURRENCY_OPTIONS.map")
    expect(wizard).not.toContain('placeholder="Currency"')
  })

  it("validates ticket currency on create and update", () => {
    const createRoute = read("app/api/events/[eventId]/tickets/route.ts")
    const updateRoute = read(
      "app/api/events/[eventId]/tickets/[ticketTypeId]/route.ts",
    )

    for (const route of [createRoute, updateRoute]) {
      expect(route).toContain("isSupportedTicketCurrency")
      expect(route).toContain("Choose ZAR for Paystack or SZL for MTN MoMo")
    }
  })
})
