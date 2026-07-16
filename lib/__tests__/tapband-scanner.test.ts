import { describe, expect, it } from "vitest"

import {
  tapBandLifecycleMessage,
  tapBandLifecycleResultToScanResult,
  tapBandLifecycleStatus,
} from "@/lib/scanning"
import type { TapBandLifecycleResult } from "@/lib/tapband/lifecycle"

describe("tapband scanner mapping", () => {
  it("maps valid TapBand lifecycle results to scanner success", () => {
    const result = tapBandLifecycleResultToScanResult(
      lifecycleResult({
        ok: true,
        valid: true,
        outcome: "valid",
        reasonCode: "tapband_valid_entitlement",
        scanId: "scan-1",
        orderItemId: "order-item-1",
        ticketTypeName: "General entry",
        checkedInAt: "2026-07-15T12:00:00.000Z",
      }),
    )

    expect(result).toMatchObject({
      valid: true,
      status: "validated",
      inputMode: "tapband",
      message: "TapBand checked in for General entry",
      scanId: "scan-1",
      orderItemId: "order-item-1",
      checkedInAt: "2026-07-15T12:00:00.000Z",
    })
  })

  it.each([
    ["lost", "tapband_lost", "TapBand was reported lost. Do not admit with this band"],
    ["replaced", "tapband_replaced", "TapBand was replaced. Use the newer TapBand or QR fallback"],
    ["no_entitlement", "tapband_no_entitlement", "No active ticket for this event is linked to this TapBand"],
    ["unknown", "tapband_unknown", "TapBand not recognised. Use QR or manual fallback"],
    ["reader_error", "tapband_reader_error", "TapBand could not be read. Try again or use QR fallback"],
    ["already_used", "duplicate", "TapBand was already checked in for this event"],
  ])("maps %s to %s", (outcome, status, message) => {
    expect(tapBandLifecycleStatus({ outcome, reasonCode: `tapband_${outcome}` })).toBe(status)
    expect(tapBandLifecycleMessage({}, status as ReturnType<typeof tapBandLifecycleStatus>)).toBe(message)
  })
})

function lifecycleResult(overrides: Partial<TapBandLifecycleResult>): TapBandLifecycleResult {
  return {
    ok: false,
    raw: {},
    ...overrides,
  }
}
