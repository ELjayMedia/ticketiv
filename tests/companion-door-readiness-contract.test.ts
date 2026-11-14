import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")
const source = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("Companion: ready for the door", () => {
  it("shows the readiness check before and on the day, not after entry", () => {
    const companion = source("components/quiet/screens/companion/event-companion.tsx")
    expect(companion).toContain('stage === "booked" || stage === "today" ? (\n          <DoorReadiness')
    // The QR shown at the door is one the holder keeps, not one offered to a friend.
    expect(companion).toContain("!offeredIds.has(t.id)")
  })

  it("reads offline copies from the existing service worker and never stores tickets itself", () => {
    const readiness = source("components/quiet/screens/companion/door-readiness.tsx")
    expect(readiness).toContain("getOfflineTicketState")
    expect(readiness).not.toMatch(/saveTicketForOffline|caches\.open|localStorage/)
  })

  it("lists only live offers the holder sent, so expired ones read as back with the sender", () => {
    const transfers = source("lib/data/attendee/transfers.ts")
    const helper = transfers.slice(transfers.indexOf("export async function getMyPendingSentTransfers"))
    expect(helper).toContain('.eq("from_user_id", user.id)')
    expect(helper).toContain('.in("status", ["requested", "pending"])')
    expect(helper).toContain("!isExpired(r.status, r.expires_at)")
  })
})
