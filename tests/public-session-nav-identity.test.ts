import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }))

import { getNavIdentity } from "@/components/quiet/shell/public-session-desktop-nav"

describe("getNavIdentity", () => {
  it("treats no user and anonymous guest-checkout users as signed out", () => {
    expect(getNavIdentity(null)).toEqual({ signedIn: false })
    expect(getNavIdentity({ id: "g", is_anonymous: true, user_metadata: {} } as never)).toEqual({ signedIn: false })
  })

  it("exposes name, email and avatar for the profile menu", () => {
    const identity = getNavIdentity({
      id: "u",
      email: "ada@example.com",
      user_metadata: { full_name: "Ada Lovelace", avatar_url: "https://img.test/a.png" },
    } as never)
    expect(identity).toMatchObject({
      signedIn: true,
      displayName: "Ada",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      avatarUrl: "https://img.test/a.png",
    })
  })
})
