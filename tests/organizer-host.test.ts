import { describe, expect, it } from "vitest"

import {
  attendeeSiteUrl,
  authCookieOptions,
  isOrganizerPath,
  organizerHostConfig,
  organizerHostRedirect,
} from "@/lib/organizer/host"

const on = { organizerHost: "organizer.ticketiv.app", attendeeHost: "ticketiv.app" }
const off = { organizerHost: null, attendeeHost: "ticketiv.app" }

describe("organizer.ticketiv.app routing (ADR 0002)", () => {
  it("does nothing until the organizer host is configured", () => {
    expect(organizerHostRedirect("https://ticketiv.app/orgs/o1/dashboard", off)).toBeNull()
    expect(organizerHostRedirect("https://organizer.ticketiv.app/", off)).toBeNull()
    expect(attendeeSiteUrl("/", off)).toBe("/")
  })

  it("opens the organizer site on the workspace picker", () => {
    expect(organizerHostRedirect("https://organizer.ticketiv.app/", on)).toBe("https://organizer.ticketiv.app/orgs")
  })

  it("moves workspace links from the attendee site to the organizer site, keeping path and query", () => {
    expect(organizerHostRedirect("https://ticketiv.app/orgs/o1/events?status=past", on)).toBe(
      "https://organizer.ticketiv.app/orgs/o1/events?status=past",
    )
    expect(organizerHostRedirect("https://ticketiv.app/onboarding/organizer", on)).toBe(
      "https://organizer.ticketiv.app/onboarding/organizer",
    )
  })

  it("sends attendee pages opened on the organizer site back to the attendee site", () => {
    expect(organizerHostRedirect("https://organizer.ticketiv.app/events/bushfire", on)).toBe(
      "https://ticketiv.app/events/bushfire",
    )
    expect(organizerHostRedirect("https://organizer.ticketiv.app/me", on)).toBe("https://ticketiv.app/me")
  })

  it("serves login, account and API paths on both sites", () => {
    for (const path of ["/login?from=%2Forgs", "/auth/callback", "/launch", "/api/sign-out", "/invite/abc", "/403"]) {
      expect(organizerHostRedirect(`https://organizer.ticketiv.app${path}`, on)).toBeNull()
      expect(organizerHostRedirect(`https://ticketiv.app${path}`, on)).toBeNull()
    }
  })

  it("never moves the scanner, so paired gate devices keep their offline data", () => {
    expect(organizerHostRedirect("https://ticketiv.app/scan/setup?code=1", on)).toBeNull()
    expect(organizerHostRedirect("https://organizer.ticketiv.app/scan", on)).toBeNull()
  })

  it("leaves preview and other hosts alone", () => {
    expect(organizerHostRedirect("https://v0-ticketiv-git-x.vercel.app/orgs/o1", on)).toBeNull()
    expect(organizerHostRedirect("http://localhost:3000/orgs/o1", on)).toBeNull()
  })

  it("does not confuse look-alike paths", () => {
    expect(isOrganizerPath("/orgs")).toBe(true)
    expect(isOrganizerPath("/orgs/o1")).toBe(true)
    expect(isOrganizerPath("/organisers")).toBe(false)
    expect(isOrganizerPath("/organizer/register")).toBe(false)
  })

  it("reads hosts from env, tolerating URLs and case", () => {
    expect(organizerHostConfig({ NEXT_PUBLIC_ORGANIZER_HOST: "https://Organizer.Ticketiv.app/", NEXT_PUBLIC_APP_URL: "https://ticketiv.app" })).toEqual(on)
    expect(organizerHostConfig({})).toEqual(off)
  })

  it("links organizer pages to the attendee site absolutely when the subdomain is on", () => {
    expect(attendeeSiteUrl("/", on)).toBe("https://ticketiv.app/")
  })

  it("shares the login cookie across subdomains only when a domain is set", () => {
    expect(authCookieOptions({ NEXT_PUBLIC_AUTH_COOKIE_DOMAIN: ".ticketiv.app" })).toEqual({ domain: ".ticketiv.app" })
    expect(authCookieOptions({})).toBeUndefined()
  })
})
