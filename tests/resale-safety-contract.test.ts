import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

// TICK-448: ticket codes are reissued on transfer and resale; sold-out events warn about off-platform resale.
describe("resale safety", () => {
  it("issues a fresh ticket code on transfer and resale completion", () => {
    const m = read("supabase/migrations/20261124170000_tick448_reissue_code_on_transfer.sql")
    expect(m.match(/ticket_code = upper\(gen_random_uuid\(\)::text\)/g)?.length).toBe(3)
    expect(m).toContain("'resale_listing_sold'")
    expect(m).toContain("events_audit_resale_cap")
  })

  it("shows the anti-scam notice on sold-out event pages, desktop and mobile", () => {
    for (const f of ["components/quiet/screens/event-detail/desktop-event.tsx", "components/quiet/screens/event-detail/mobile-event.tsx"]) {
      expect(read(f)).toContain("<SoldOutResaleNotice")
    }
    expect(read("components/quiet/screens/event-detail/sold-out-resale-notice.tsx")).toContain("Report a scam")
    expect(read("app/(consumer)/support/page.tsx")).toContain("Fake or scam resale ticket")
  })
})
