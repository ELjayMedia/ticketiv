import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")
const source = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("Discover: intent and follows", () => {
  it("leads with Tonight and This weekend, which search understands", () => {
    const chips = source("components/quiet/screens/discover/discover-filter-chips.tsx")
    expect(chips.indexOf('value: "tonight"')).toBeLessThan(chips.indexOf('value: "week"'))
    expect(chips).toContain('value: "weekend"')
    const search = source("lib/data/public/search.ts")
    expect(search).toContain('"tonight"')
    expect(search).toContain('"weekend"')
  })

  it("loads the follow row after the cached page, for real accounts only, from the public card view", () => {
    const action = source("app/(consumer)/follows/feed-actions.ts")
    expect(action).toContain("user.is_anonymous")
    expect(action).toContain('.from("v_public_event_cards")')
    // Upcoming only: same end-of-event cutoff as the rest of Discover.
    expect(action).toContain("discoveryEventEndCutoffIso")
    for (const screen of ["mobile-discover", "desktop-discover"]) {
      expect(source(`components/quiet/screens/discover/${screen}.tsx`)).toContain("<FollowingEventsRow")
    }
    // The Discover page itself stays a static, cacheable route.
    expect(source("app/(public)/page.tsx")).toContain('export const dynamic = "force-static"')
  })
})
