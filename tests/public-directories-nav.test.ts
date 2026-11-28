import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

describe("public desktop nav", () => {
  it("lists Venues and Artists right after Organisers", () => {
    const nav = read("components/quiet/shell/desktop-nav.tsx")
    const order = ["/organisers", "/venues", "/artists"].map((href) => nav.indexOf(`{ href: "${href}"`))
    expect(order.every((i) => i > 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it("the artist directory reads with the anonymous client only", () => {
    const page = read("app/(public)/artists/page.tsx")
    expect(page).toContain("createPublicSupabaseClient()")
    expect(page).not.toContain("createServerSupabaseClient")
    expect(page).not.toContain("createAdminClient")
  })
})
