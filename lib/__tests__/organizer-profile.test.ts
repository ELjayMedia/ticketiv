import { describe, expect, it } from "vitest"

import { normalizeOrgProfileInput } from "@/lib/data/organizer/profile"

describe("organizer profile", () => {
  it("normalizes editable organization profile fields", () => {
    expect(
      normalizeOrgProfileInput({
        name: "  Ticketiv Events  ",
        bio: "  Live events and festivals  ",
        logo: "  https://cdn.example.com/logo.png  ",
        defaultCurrency: " szl ",
      }),
    ).toEqual({
      ok: true,
      payload: {
        name: "Ticketiv Events",
        bio: "Live events and festivals",
        logo: "https://cdn.example.com/logo.png",
        default_currency: "SZL",
      },
    })
  })

  it("requires a name and valid currency", () => {
    expect(
      normalizeOrgProfileInput({
        name: "",
        bio: "",
        logo: "",
        defaultCurrency: "SZL",
      }),
    ).toEqual({ ok: false, error: "Organization name is required." })

    expect(
      normalizeOrgProfileInput({
        name: "Ticketiv Events",
        bio: "",
        logo: "",
        defaultCurrency: "SZ",
      }),
    ).toEqual({ ok: false, error: "Default currency must be a 3-letter ISO currency code." })
  })

  it("allows app-hosted logo paths and rejects unsupported logo URLs", () => {
    expect(
      normalizeOrgProfileInput({
        name: "Ticketiv Events",
        bio: "",
        logo: "/logos/ticketiv.png",
        defaultCurrency: "SZL",
      }),
    ).toEqual({
      ok: true,
      payload: {
        name: "Ticketiv Events",
        bio: null,
        logo: "/logos/ticketiv.png",
        default_currency: "SZL",
      },
    })

    expect(
      normalizeOrgProfileInput({
        name: "Ticketiv Events",
        bio: "",
        logo: "http://example.com/logo.png",
        defaultCurrency: "SZL",
      }),
    ).toEqual({ ok: false, error: "Logo must be an https URL or an absolute app path." })
  })
})
