import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

// TICK-448: the resale screens are wired to the database-enforced flow.
describe("resale listing UI", () => {
  it("submits the ticket screen to publishResaleListing with the price and ticket", () => {
    const screen = read("components/quiet/screens/tickets/resale.tsx")
    expect(screen).toContain("useActionState(publishResaleListing")
    expect(screen).toMatch(/name="ticketId"/)
    expect(screen).toMatch(/name="price"/)
    expect(screen).toContain('type="submit"')
    // Same rounding as the database cap, so the slider never offers a refused price.
    expect(screen).toContain("Math.floor(ticket.faceMinor * capRate)")
  })

  it("marks listings as verified and warns against off-platform sales", () => {
    const centre = read("components/quiet/screens/resale/resale-centre.tsx")
    expect(centre).toContain("Verified ticket")
    expect(centre).toContain("Never pay a seller outside Ticketiv")
  })
})
