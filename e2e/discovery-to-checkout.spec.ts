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

    // Get tickets opens the ticket picker (Eventbrite-style). A lone on-sale
    // type is preselected; otherwise add one ticket of the first available type.
    const getTickets = page.getByRole("button", { name: /get tickets/i }).last()
    await expect(getTickets).toBeEnabled()
    await getTickets.click()
    const picker = page.getByRole("dialog")
    await expect(picker).toBeVisible()
    const pickerCheckout = picker.getByRole("button", { name: /check out|select tickets/i })
    await expect(pickerCheckout).toBeVisible({ timeout: 15_000 })
    if (/select tickets/i.test((await pickerCheckout.textContent()) ?? "")) {
      await picker.getByRole("button", { name: "Increase" }).and(picker.locator(":enabled")).first().click()
    }
    await expect(picker.getByRole("button", { name: /check out/i })).toBeEnabled()
    await picker.getByRole("button", { name: /check out/i }).click()

    // A failed hold returns to the picker (?hold_failed=1) instead of checkout,
    // so waiting for /checkout also proves the hold was created.
    await page.waitForURL(/\/events\/[^/]+(\/checkout|\?.*hold_failed=1)/)
    const checkoutUrl = new URL(page.url())
    expect(checkoutUrl.searchParams.get("hold_failed"), "seat-hold creation must not fail").not.toBe("1")
    expect(checkoutUrl.pathname, "picker must hand off to checkout").toMatch(/\/checkout$/)
    expect(checkoutUrl.searchParams.get("hold"), "checkout must carry an active seat hold").toBeTruthy()
    expect(checkoutUrl.searchParams.get("items"), "checkout must carry the picked cart").toBeTruthy()

    // Mobile and desktop checkout trees are both mounted, with CSS hiding one.
    // Fill the visible guest contact fields with user-like interactions, then
    // assert the gates that control the payment CTA before crossing the
    // provider boundary.
    async function typeInto(selector: string, value: string) {
      const field = page.locator(`${selector}:visible`).first()
      await expect(field).toBeVisible()
      await field.click()
      await field.fill("")
      await field.pressSequentially(value)
      await expect(field).toHaveValue(value)
      return field
    }
    await typeInto('input[id$="-contact-firstName"]', "UAT")
    await typeInto('input[id$="-contact-lastName"]', "Buyer")
    const buyerEmailField = await typeInto('input[id$="-contact-email"]', buyerEmail)
    await typeInto('input[id$="-contact-confirmEmail"]', buyerEmail)

    const policyCheckbox = page.locator('input[id$="-policy-acceptance"]:visible').first()
    await expect(policyCheckbox).toBeVisible()
    await policyCheckbox.click()
    await expect(policyCheckbox).toBeChecked()

    await expect(buyerEmailField, "buyer email must remain populated in the controlled checkout form").toHaveValue(buyerEmail)
    await expect(policyCheckbox, "refund/terms acceptance must remain checked").toBeChecked()
    await expect(
      page.getByText(/(tickets are held|holds) for/i).locator("visible=true").first(),
      "seat hold must remain active before payment",
    ).toBeVisible()

    const paymentCta = page.getByRole("button", { name: /^pay /i })
    await expect(paymentCta).toBeEnabled({ timeout: 10_000 })
    await paymentCta.click()

    await page.waitForURL(/checkout\.paystack\.com|\/orders\/[^/]+\/confirmation/, {
      timeout: 30_000,
    })
  })
})
