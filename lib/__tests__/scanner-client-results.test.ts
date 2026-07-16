import { describe, expect, it } from "vitest"

import {
  normalizeCredentialPublicId,
  scannerResultFromPayload,
  scannerStatusTitle,
  scannerStatusTone,
  shouldSuppressTapBandRead,
} from "@/lib/scanner/client-results"

describe("scanner client results", () => {
  it("normalizes legacy QR scan outcomes", () => {
    const result = scannerResultFromPayload(
      {
        outcome: "already_used",
        message: "Ticket already checked in",
        ticket: {
          id: "order-item-1",
          type: "General entry",
          checked_in_at: "2026-07-15T12:00:00.000Z",
        },
      },
      false,
      "qr",
    )

    expect(result).toMatchObject({
      valid: false,
      status: "duplicate",
      inputMode: "qr",
      message: "Ticket already checked in",
      orderItemId: "order-item-1",
      ticketTypeName: "General entry",
      checkedInAt: "2026-07-15T12:00:00.000Z",
    })
  })

  it("keeps TapBand statuses user-visible without customer profile data", () => {
    const result = scannerResultFromPayload(
      {
        valid: false,
        status: "tapband_no_entitlement",
        inputMode: "tapband",
        message: "No active ticket for this event is linked to this TapBand",
      },
      false,
      "qr",
    )

    expect(result.status).toBe("tapband_no_entitlement")
    expect(result.inputMode).toBe("tapband")
    expect(scannerStatusTitle(result.status, result.inputMode)).toBe("No ticket for this event")
    expect(scannerStatusTone(result.status)).toBe("danger")
  })

  it.each([
    ["https://ticketiv.com/tapband/pub-1", "pub-1"],
    ["https://ticketiv.com/checkin?credentialPublicId=pub-2", "pub-2"],
    ["https://ticketiv.com/checkin?credential_public_id=pub-3", "pub-3"],
    ["tapband:pub-4", "pub-4"],
    [" pub-5 ", "pub-5"],
  ])("normalizes credential %s", (input, expected) => {
    expect(normalizeCredentialPublicId(input)).toBe(expected)
  })

  it("suppresses repeated TapBand reads inside the cooldown", () => {
    const previous = {
      credentialPublicId: "PUB-1",
      attemptedAt: 1000,
      attemptId: "tapband-attempt-1",
    }

    expect(shouldSuppressTapBandRead(previous, "pub-1", 4000, 3500)).toBe(true)
    expect(shouldSuppressTapBandRead(previous, "pub-1", 4600, 3500)).toBe(false)
    expect(shouldSuppressTapBandRead(previous, "pub-2", 4000, 3500)).toBe(false)
    expect(shouldSuppressTapBandRead(null, "pub-1", 4000, 3500)).toBe(false)
  })
})
