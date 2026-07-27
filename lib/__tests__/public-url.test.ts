import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  TICKETIV_PUBLIC_ORIGIN,
  buildTicketivPublicUrl,
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
  })

  it("keeps local or preview origins when no configured app URL is set", () => {
    expect(getTicketivPublicOrigin("http://localhost:3000")).toBe("http://localhost:3000")
    expect(buildTicketivPublicUrl("scan", "https://preview.vercel.app")).toBe(
      "https://preview.vercel.app/scan",
    )
  })

  it("prefers a configured public app URL and still canonicalizes ticketiv.com", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ticketiv.com"

    expect(getTicketivPublicOrigin("http://localhost:3000")).toBe("https://ticketiv.app")
  })
})
