import { describe, expect, it } from "vitest"

import { buildProviderPaymentReference } from "@/lib/payments"

describe("provider payment references", () => {
  it("builds a Paystack-compatible reference", () => {
    const reference = buildProviderPaymentReference(
      "paystack",
      "11111111-2222-4333-8444-555555555555",
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    )

    expect(reference).toBe(
      "paystack-11111111-2222-4333-8444-555555555555-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    )
    expect(reference).toMatch(/^[A-Za-z0-9.=-]+$/)
    expect(reference).not.toContain("_")
  })
})
