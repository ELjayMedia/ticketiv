import { test, expect } from "@playwright/test"

// TICK-334 / TICK-407 — buyer happy path: discovery → event detail →
// checkout → Paystack hosted-payment handoff.
//
// This browser spec proves that the attendee journey reaches the real payment
// initialization boundary. The database-asserted money-path lifecycle suite
// separately proves that successful completion writes exactly one payment,
// marks the order paid, issues the ticket, balances the ledger and remains
// idempotent on redelivery. Together those two checks form the blocking launch
// gate; a CTA-only smoke is not sufficient evidence.

const STRICT_E2E = process.env.E2E_STRICT === "1"
const LOCAL_WITHOUT_SUPABASE =
  !process.env.PLAYWRIGHT_BASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL
const SEEDED_CHECKOUT_ENV = [
  "E2E_TEST_EVENT_SLUG",
  "E2E_TEST_BUYER_EMAIL",
  "E2E_PAYSTACK_TEST_KEY",
] as const

function missingSeededCheckoutEnv() {
  return SEEDED_CHECKOUT_ENV.filter((key) => !process.env[key]?.trim())
}

test("discover page renders event cards", async ({ page }) => {
  const res = await page.goto("/")
  expect(res?.ok()).toBeTruthy()
  await expect(page).toHaveTitle(/Discover|Ticketiv/i)
})

test("an event card leads to an event detail page", async ({ page }) => {
  test.skip(
    LOCAL_WITHOUT_SUPABASE && !STRICT_E2E,
    "Local event detail needs Supabase env; deployed/seeded targets still run this smoke.",
  )

  await page.goto("/")
  const firstEvent = page.locator('a[href^="/events/"]').first()

  const eventCardCount = await firstEvent.count()
  if (eventCardCount === 0) {
    if (STRICT_E2E) {
      expect(
        eventCardCount,
        "Strict E2E requires at least one public seeded event card.",
      ).toBeGreaterThan(0)
    }
    test.skip(true, "No public events in this environment — needs seeded data.")
  }

  const href = await firstEvent.getAttribute("href")
  expect(href, "event card should have an href").toBeTruthy()
  const res = await page.goto(href!)
  expect(res?.ok(), "event detail page should return 2xx").toBeTruthy()
  await expect(page).toHaveURL(/\/events\//)
  await expect(page.locator("h1").first()).toHaveText(/\S/)
})

test("seeded checkout prerequisites are present when strict E2E is enabled", async () => {
  test.skip(!STRICT_E2E, "Set E2E_STRICT=1 once seeded UAT is ready to make the money path blocking.")
  expect(missingSeededCheckoutEnv()).toEqual([])
})

test.describe("seeded guest checkout → hosted payment handoff", () => {
  const missing = missingSeededCheckoutEnv()

  test.skip(
    missing.length > 0 && !STRICT_E2E,
    `Requires seeded UAT env: ${missing.join(", ")}.`,
  )

  test("creates checkout state and initializes the payment provider", async ({ page }) => {
    expect(missing, "Seeded checkout environment must be complete.").toEqual([])

    const eventSlug = process.env.E2E_TEST_EVENT_SLUG!
    const buyerEmail = process.env.E2E_TEST_BUYER_EMAIL!

    await page.goto(`/events/${encodeURIComponent(eventSlug)}`)
    await expect(page.locator("h1").first()).toHaveText(/\S/)

    const checkoutCta = page.getByRole("button", { name: /continue|get tickets/i }).last()
    await expect(checkoutCta).toBeEnabled()
    await checkoutCta.click()
    await page.waitForURL(/\/events\/[^/]+\/checkout/)

    const checkoutUrl = new URL(page.url())
    expect(checkoutUrl.searchParams.get("hold_failed"), "seat-hold creation must not fail").not.toBe("1")
    expect(checkoutUrl.searchParams.get("hold"), "checkout must carry an active seat hold").toBeTruthy()

    // Mobile and desktop checkout trees are both mounted, with CSS hiding one.
    // Fill the visible buyer fields with user-like interactions, then assert the
    // gates that actually control the payment CTA before crossing the provider boundary.
    const buyerNameField = page.locator('input[placeholder="Your full name"]:visible').first()
    await expect(buyerNameField).toBeVisible()
    await buyerNameField.click()
    await buyerNameField.pressSequentially("UAT Buyer")
    await expect(buyerNameField).toHaveValue("UAT Buyer")

    const buyerEmailField = page.locator('input[type="email"]:visible').first()
    await expect(buyerEmailField).toBeVisible()
    await buyerEmailField.click()
    await buyerEmailField.fill("")
    await buyerEmailField.pressSequentially(buyerEmail)
    await expect(buyerEmailField).toHaveValue(buyerEmail)

    const buyerPhoneField = page.locator('input[type="tel"]:visible').first()
    await expect(buyerPhoneField).toBeVisible()
    await buyerPhoneField.click()
    await buyerPhoneField.pressSequentially("76123456")
    await expect(buyerPhoneField).not.toHaveValue("")

    const policyCheckbox = page.locator("#desktop-policy-acceptance")
    await expect(policyCheckbox).toBeVisible()
    await policyCheckbox.click()
    await expect(policyCheckbox).toBeChecked()

    // The checkout component enables payment when React has buyer email,
    // an active hold and accepted policy. These assertions make CI failures
    // diagnostic rather than hiding a hydration/state regression.
    await expect(buyerEmailField, "buyer email must remain populated in the controlled checkout form").toHaveValue(buyerEmail)
    await expect(policyCheckbox, "refund/terms acceptance must remain checked").toBeChecked()
    await expect(page.getByText(/your seats are held for/i), "seat hold must remain active before payment").toBeVisible()

    const paymentCta = page.getByRole("button", { name: /continue to payment/i })
    await expect(paymentCta).toBeEnabled({ timeout: 10_000 })
    await paymentCta.click()

    await page.waitForURL(/checkout\.paystack\.com|\/orders\/[^/]+\/confirmation/, {
      timeout: 30_000,
    })
  })
})
