import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { promoDiscountMinor } from "@/components/quiet/screens/checkout/promo-code-input"

const root = resolve(import.meta.dirname, "..")
const source = (path: string) => readFileSync(resolve(root, path), "utf8")
const CHECKOUTS = [
  "components/quiet/screens/checkout/mobile-checkout.tsx",
  "components/quiet/screens/checkout/desktop-checkout.tsx",
]

describe("checkout has one promo control and no exits", () => {
  for (const path of CHECKOUTS) {
    it(`${path}: one promo control, one order creation, no detours`, () => {
      const file = source(path)
      expect(file.match(/<PromoCodeInput\b/g)).toHaveLength(1)
      // Checking a code must never create an order: only paying calls the action.
      expect(file.match(/startCheckoutAction\(\{/g)).toHaveLength(1)
      expect(file).toContain("promoCode: promo?.code ?? null")
      expect(file).not.toContain("placeholder.invalid")
      expect(file).not.toContain('"/profile"')
      expect(file).not.toContain("Add new payment method")
    })
  }

  it("never quotes buyer-side fees (Ticketiv's fee comes out of the payout)", () => {
    for (const path of [...CHECKOUTS, "app/(focused)/events/[id]/checkout/actions.ts", "app/(focused)/events/[id]/checkout/page.tsx"]) {
      expect(source(path), path).not.toMatch(/from "@\/lib\/pricing"/)
    }
  })

  it("estimates the discount the server will apply, capped at the subtotal", () => {
    expect(promoDiscountMinor(null, 50_000)).toBe(0)
    expect(promoDiscountMinor({ code: "TEN", discountType: "percent", discountValue: 10 }, 50_000)).toBe(5_000)
    expect(promoDiscountMinor({ code: "OFF", discountType: "fixed", discountValue: 2_500 }, 50_000)).toBe(2_500)
    expect(promoDiscountMinor({ code: "BIG", discountType: "fixed", discountValue: 90_000 }, 50_000)).toBe(50_000)
  })
})

describe("event page follows are real", () => {
  for (const path of [
    "components/quiet/screens/event-detail/mobile-event.tsx",
    "components/quiet/screens/event-detail/desktop-event.tsx",
  ]) {
    it(`${path} persists follows instead of local state`, () => {
      const file = source(path)
      expect(file).toContain("useFollows(")
      expect(file).not.toMatch(/followedArtists|setFollowedOrganizer/)
    })
  }

  it("follow writes go through the SECURITY DEFINER RPCs and skip guest sessions", () => {
    const actions = source("app/(consumer)/follows/actions.ts")
    expect(actions).toContain('"fn_set_org_follow"')
    expect(actions).toContain('"fn_set_artist_follow"')
    expect(actions).toContain("user.is_anonymous")
    expect(actions).not.toMatch(/\.from\("(org|artist)_follows"\)\.(insert|upsert|delete|update)/)
  })
})
