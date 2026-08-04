import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { FriendsOverview } from "@/lib/data/attendee/friends"
import { mapFriends } from "@/lib/mappers/friends"

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL
})

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
})

const overview: FriendsOverview = {
  totalFriends: 0,
  pendingRequests: 0,
  goingTogether: null,
  activity: [],
  friends: [],
  suggested: [],
  inviteHandle: "smit",
}

describe("friends mapper", () => {
  it("builds invite links on ticketiv.app and canonicalizes legacy hosts", () => {
    expect(mapFriends(overview).inviteLink).toBe("https://ticketiv.app/?ref=smit")
    expect(mapFriends(overview, "https://ticketiv.com").inviteLink).toBe(
      "https://ticketiv.app/?ref=smit",
    )
  })

  it("does not fall back to the fake /r/you profile link when no handle exists", () => {
    expect(mapFriends({ ...overview, inviteHandle: null }).inviteLink).toBe(
      "https://ticketiv.app",
    )
  })
})
