import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")
const source = (path: string) => readFileSync(resolve(root, path), "utf8")
const mobile = source("components/quiet/screens/discover/mobile-discover.tsx")
const desktop = source("components/quiet/screens/discover/desktop-discover.tsx")

describe("Discover layout", () => {
  it("hides This week when nothing is on in the next 7 days", () => {
    for (const screen of [mobile, desktop]) {
      expect(screen).toMatch(/\{thisWeek\.events\.length > 0 \? \(\s*<(EventListSection|DesktopEventGridSection)\s+title="This week"/)
    }
  })

  it("keeps the top of the page light: no Recently viewed on either screen", () => {
    for (const screen of [mobile, desktop]) expect(screen).not.toContain("<RecentlyViewedSection")
    // Desktop: "You might also like" is parked for now.
    expect(desktop).not.toContain("<SuggestedEventsRow")
  })

  it("puts From who you follow below the editor's pick on mobile", () => {
    expect(mobile.indexOf("Editor&apos;s pick")).toBeGreaterThan(-1)
    expect(mobile.indexOf("<FollowingEventsRow")).toBeGreaterThan(mobile.indexOf("Editor&apos;s pick"))
  })
})
