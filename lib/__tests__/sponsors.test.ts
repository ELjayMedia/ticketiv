import { describe, expect, it } from "vitest"

import { sponsorErrorMessage, splitSponsors } from "@/lib/sponsors"

describe("splitSponsors", () => {
  it("puts featured sponsors first and keeps the organiser's order in each group", () => {
    const list = [
      { name: "B", featured: false },
      { name: "A", featured: true },
      { name: "C", featured: false },
      { name: "D", featured: true },
    ]
    const { featured, others } = splitSponsors(list)
    expect(featured.map((s) => s.name)).toEqual(["A", "D"])
    expect(others.map((s) => s.name)).toEqual(["B", "C"])
  })
})

describe("sponsorErrorMessage", () => {
  it("maps database errors to plain messages", () => {
    expect(sponsorErrorMessage({ message: "forbidden" })).toMatch(/can't change/)
    expect(sponsorErrorMessage({ message: "sponsor_exists" })).toMatch(/already exists/)
    expect(sponsorErrorMessage({ message: "website_invalid" })).toMatch(/example\.com/)
    expect(sponsorErrorMessage(null)).toMatch(/Try again/)
  })
})
