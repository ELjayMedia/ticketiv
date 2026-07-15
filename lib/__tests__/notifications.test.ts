import { describe, expect, it } from "vitest"

import { buildTapBandLostNotificationPayload } from "@/lib/notifications"

describe("notifications", () => {
  it("builds a privacy-safe TapBand lost confirmation payload", () => {
    const payload = buildTapBandLostNotificationPayload({
      safeLabel: "TapBand ending A1B2",
      serialSuffix: "A1B2",
      reportedAt: "2026-07-15T21:00:00.000Z",
    })

    expect(payload).toEqual({
      title: "TapBand marked lost",
      message: "TapBand ending A1B2 was marked lost. It will stop working for entry, but your tickets remain in your account.",
      credentialLabel: "TapBand ending A1B2",
      serialSuffix: "A1B2",
      reportedAt: "2026-07-15T21:00:00.000Z",
    })
    expect(JSON.stringify(payload)).not.toContain("credential-")
  })
})
