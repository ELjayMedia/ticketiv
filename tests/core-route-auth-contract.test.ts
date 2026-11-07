import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// These routes act on the service role with the caller's user id (create an
// order, start a payment, read any order, admit a ticket). getSession() only
// decodes the auth cookie without verifying it, so each must resolve the user
// through getAuthUser() (Supabase getUser), and never through getSession().
const CORE_ROUTES = [
  "app/api/events/[eventId]/checkout/route.ts",
  "app/api/events/[eventId]/scan/route.ts",
  "app/api/orders/route.ts",
  "app/api/orders/[orderId]/route.ts",
  "app/api/payments/attempt/route.ts",
]

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("core route authentication", () => {
  it.each(CORE_ROUTES)("%s verifies the user instead of trusting the session cookie", (file) => {
    const source = read(file)
    expect(source).not.toContain("getSession(")
    expect(source).toContain("getAuthUser()")
  })

  it("legacy check-in goes through the atomic scan route, not a direct update", () => {
    const source = read("app/api/events/[eventId]/checkin/route.ts")
    expect(source).toContain('from "../scan/route"')
    expect(source).not.toContain(".update(")
    expect(source).not.toContain("getSession(")
  })

  it("order creation entry points share strict item parsing and a rate limit", () => {
    for (const file of [
      "app/api/events/[eventId]/checkout/route.ts",
      "app/api/orders/route.ts",
      "app/(focused)/events/[id]/checkout/actions.ts",
    ]) {
      const source = read(file)
      expect(source).toContain("parseCheckoutItems(")
      expect(source).toContain('"orders:create"')
    }
  })

  it("payment attempts only keep a same-origin return URL", () => {
    const source = read("lib/payments.ts")
    expect(source).toContain("sameOriginReturnUrl(input.returnUrl, APP_URL)")
    expect(source).not.toMatch(/initialize\w+Transaction\(order, extRef, input\.returnUrl\)/)
  })
})
