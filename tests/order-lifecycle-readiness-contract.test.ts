import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const source = fs.readFileSync(
  path.join(process.cwd(), "app/orgs/[orgId]/events/[eventId]/orders/page.tsx"),
  "utf8",
)

describe("organizer order lifecycle readiness", () => {
  it("uses authenticated user validation and preserves the destination", () => {
    expect(source).toContain("supabase.auth.getUser()")
    expect(source).toContain("/login?next=")
    expect(source).not.toContain("supabase.auth.getSession()")
  })

  it("supports order reference search as well as buyer email", () => {
    expect(source).toContain("startsWith(filterQ.toLowerCase())")
    expect(source).toContain("id.in.")
    expect(source).toContain("buyer_email.ilike")
  })

  it("uses persisted item totals and per-order currencies", () => {
    expect(source).toContain("item_count")
    expect(source).toContain("order.item_count ?? 0")
    expect(source).toContain('order.currency ?? "SZL"')
    expect(source).not.toContain("orderItemCountMap")
  })

  it("validates view, status, input length and out-of-range pages", () => {
    expect(source).toContain('sp.view === "attendees" ? "attendees" : "orders"')
    expect(source).toContain("allowedStatuses.has(rawStatus)")
    expect(source).toContain("slice(0, 200)")
    expect(source).toContain("page > totalPages")
  })
})
