import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  TICKETIV_PUBLIC_ORIGIN,
  buildTicketivPublicUrl,
  getTicketivCanonicalRedirect,
  getTicketivPublicOrigin,
  normalizePublicOrigin,
} from "@/lib/public-url"

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL
})

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
})

describe("public Ticketiv URLs", () => {
  it("defaults generated public links to ticketiv.app", () => {
    expect(getTicketivPublicOrigin()).toBe(TICKETIV_PUBLIC_ORIGIN)
    expect(buildTicketivPublicUrl("/tickets")).toBe("https://ticketiv.app/tickets")
    expect(buildTicketivPublicUrl()).toBe("https://ticketiv.app")
  })

  it("canonicalizes legacy ticketiv.com origins to ticketiv.app", () => {
    expect(normalizePublicOrigin("https://ticketiv.com")).toBe("https://ticketiv.app")
    expect(normalizePublicOrigin("https://www.ticketiv.com/r/you")).toBe("https://ticketiv.app")
    expect(buildTicketivPublicUrl("/?ref=smit", "https://ticketiv.com")).toBe(
      "https://ticketiv.app/?ref=smit",
    )
    expect(buildTicketivPublicUrl("/invite/team-token", "https://ticketiv.com")).toBe(
      "https://ticketiv.app/invite/team-token",
    )
    expect(
      buildTicketivPublicUrl("/auth/callback?next=/reset-password", "https://ticketiv.com"),
    ).toBe("https://ticketiv.app/auth/callback?next=/reset-password")
  })

  it("keeps local origins but canonicalizes Vercel deployment hosts", () => {
    expect(getTicketivPublicOrigin("http://localhost:3000")).toBe("http://localhost:3000")
    expect(buildTicketivPublicUrl("scan", "https://preview.vercel.app")).toBe(
      "https://ticketiv.app/scan",
    )
    expect(
      buildTicketivPublicUrl(
        "/auth/callback?next=/reset-password",
        "https://v0-ticketiv-eljaymedia.vercel.app",
      ),
    ).toBe("https://ticketiv.app/auth/callback?next=/reset-password")
  })

  it("canonicalizes a configured Vercel deployment host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://v0-ticketiv-eljaymedia.vercel.app"

    expect(buildTicketivPublicUrl("/auth/callback?next=/reset-password")).toBe(
      "https://ticketiv.app/auth/callback?next=/reset-password",
    )
  })

  it("redirects stable legacy hosts while preserving paths and branch previews", () => {
    expect(
      getTicketivCanonicalRedirect(
        "https://v0-ticketiv-eljaymedia.vercel.app/forgot-password?from=email",
      ),
    ).toBe("https://ticketiv.app/forgot-password?from=email")
    expect(getTicketivCanonicalRedirect("https://www.ticketiv.app/profile")).toBe(
      "https://ticketiv.app/profile",
    )
    expect(
      getTicketivCanonicalRedirect(
        "https://v0-ticketiv-git-agent-tick-354-password-recov-2227a1-eljaymedia.vercel.app/forgot-password",
      ),
    ).toBeNull()
    expect(getTicketivCanonicalRedirect("http://localhost:3000/forgot-password")).toBeNull()
  })

  it("prefers a configured public app URL and still canonicalizes ticketiv.com", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ticketiv.com"

    expect(getTicketivPublicOrigin("http://localhost:3000")).toBe("https://ticketiv.app")
  })
})
