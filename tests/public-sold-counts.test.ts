import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Ticket sales are organizer-only. Attendee-facing cards and event pages must
 * not show how many tickets sold ("7 sold"), directly or as "N going".
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const ATTENDEE_SURFACES = [
  "lib/mappers/discover.ts",
  "lib/mappers/search.ts",
  "components/standardized/event-card-standard.tsx",
  "components/quiet/screens/discover/mobile-discover.tsx",
  "components/quiet/screens/discover/desktop-discover.tsx",
  "components/quiet/screens/discover/suggested-events-row.tsx",
  "components/quiet/screens/search/search-results.tsx",
]

describe("attendees never see ticket sales counts", () => {
  it("cards and search results don't format or render a sold count", () => {
    for (const file of ATTENDEE_SURFACES) {
      const source = read(file)
      expect(source, file).not.toContain("formatSoldCount")
      expect(source, file).not.toMatch(/soldLabel|trustLabel/)
    }
  })

  it("the event page's going chip isn't fed from tickets sold", () => {
    for (const file of ["app/(focused)/events/[id]/page.tsx", "components/quiet/screens/event-detail/live-event-shell.tsx"]) {
      const source = read(file)
      expect(source, file).not.toMatch(/attendeeCount[^\n]*tickets_sold/)
      expect(source, file).not.toMatch(/soldCount:\s*[^\n]*tickets_sold/)
    }
  })
})
