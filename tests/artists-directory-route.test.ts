import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("artists directory", () => {
  it("is not redirected to search", () => {
    expect(readFileSync("next.config.mjs", "utf8")).not.toMatch(/source: "\/artists"/)
  })

  it("links each artist to their own page", () => {
    expect(readFileSync("app/(public)/artists/page.tsx", "utf8")).toContain("href={artistHref(artist)}")
  })
})
