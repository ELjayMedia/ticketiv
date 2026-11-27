import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { checkoutPayBlocker } from "@/lib/checkout/pay-blocker"

const root = resolve(import.meta.dirname, "..")
const source = (path: string) => readFileSync(resolve(root, path), "utf8")
const CHECKOUTS = [
  "components/quiet/screens/checkout/mobile-checkout.tsx",
  "components/quiet/screens/checkout/desktop-checkout.tsx",
]

describe("checkout asks only for what the order uses", () => {
  for (const path of CHECKOUTS) {
    it(`${path}: email only, no acceptance checkbox, collapsed promo`, () => {
      const file = source(path)
      // startCheckoutAction takes the email, cart and promo code — nothing else
      // typed in checkout reaches the order, so checkout must not ask for it.
      expect(file).not.toMatch(/attendee(Name|Phone|Details)|buyer(Name|Phone)/)
      expect(file).not.toContain('type="checkbox"')
      expect(file).toContain("checkoutPayBlocker(")
      expect(file).toMatch(/<PromoCodeInput[\s\S]*?collapsible/)
      expect(file).toMatch(/agree to the/)
    })
  }
})

describe("checkoutPayBlocker", () => {
  const ok = { buyerEmail: "buyer@example.com", holdRemaining: 300, lineCount: 1 }
  it("is null when the buyer can pay", () => {
    expect(checkoutPayBlocker(ok)).toBeNull()
  })
  it("names the single thing in the way", () => {
    expect(checkoutPayBlocker({ ...ok, buyerEmail: "  " })).toBe("Add your email")
    expect(checkoutPayBlocker({ ...ok, buyerEmail: "buyer@example" })).toBe("Check your email")
    expect(checkoutPayBlocker({ ...ok, holdRemaining: 0 })).toBe("Hold expired")
    expect(checkoutPayBlocker({ ...ok, lineCount: 0 })).toBe("Choose tickets")
  })
})
