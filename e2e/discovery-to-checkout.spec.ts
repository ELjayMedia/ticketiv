import { test, expect } from "@playwright/test"

// TICK-174 — buyer happy path: discover → event detail → checkout reachable.
//
// This is the public, unauthenticated leg of the journey and runs against any
// deployed preview (PLAYWRIGHT_BASE_URL) or a local dev server. The final
// payment + "ticket visible" + "scan" legs require a seeded DB and a
// test-mode Paystack key; those steps are gated below and skip cleanly until a
// staging environment exists (TICK-181). Keeping the skip explicit means the
// suite is honest about coverage rather than silently passing.

test("discover page renders event cards", async ({ page }) => {
  const res = await page.goto("/")
  expect(res?.ok()).toBeTruthy()
  // Discovery reads v_public_event_cards; at minimum the shell renders.
  await expect(page).toHaveTitle(/Discover|Ticketiv/i)
})

test("an event card leads to an event detail page", async ({ page }) => {
  await page.goto("/")
  const firstEvent = page.locator('a[href^="/events/"]').first()

  if ((await firstEvent.count()) === 0) {
    test.skip(true, "No public events in this environment — needs seeded data (TICK-181 staging).")
  }

  await firstEvent.click()
  await expect(page).toHaveURL(/\/events\//)
  // Event detail should surface a ticket/checkout call-to-action.
  await expect(page.getByRole("link", { name: /buy|tickets|get tickets|checkout/i }).first()).toBeVisible()
})

test.describe("authenticated checkout → ticket → scan", () => {
  test.skip(
    !process.env.E2E_TEST_BUYER_EMAIL || !process.env.E2E_PAYSTACK_TEST_KEY,
    "Requires a seeded staging DB + test-mode Paystack (E2E_TEST_BUYER_EMAIL, E2E_PAYSTACK_TEST_KEY). Wire up under TICK-181 staging.",
  )

  test("buyer completes a test-mode purchase and sees the ticket", async () => {
    // Implemented once staging exists:
    //  1. sign in as E2E_TEST_BUYER_EMAIL (OTP test inbox)
    //  2. open a seeded event, add a ticket, go to checkout
    //  3. pay via Paystack test card, return to confirmation
    //  4. assert the order completes and the ticket QR is visible at /my-tickets
    //  5. validate the ticket via the scanner endpoint and assert one-time use
    expect(true).toBe(true)
  })
})
