import { describe, expect, it } from "vitest"

import { discoveryEventEndCutoffIso } from "@/lib/events/discovery-window"

describe("discoveryEventEndCutoffIso", () => {
  it("uses the approved three-hour operational grace window", () => {
    expect(
      discoveryEventEndCutoffIso(
        new Date("2026-09-27T12:00:00.000Z").getTime(),
      ),
    ).toBe("2026-09-27T09:00:00.000Z")
  })
})
