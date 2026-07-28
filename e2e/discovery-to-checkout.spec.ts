import { test, expect } from "@playwright/test"

// TICK-334 — buyer happy path: discover → event detail → checkout reachable.
//
// This is the public, unauthenticated leg of the journey and runs against any
// deployed preview (PLAYWRIGHT_BASE_URL) or a local dev server. The final
// payment + "ticket visible" + "scan" legs require a seeded DB, a known event
// and a test-mode Paystack key. Strict mode turns missing seeded prerequisites
// into a failure so the same suite can become blocking when staging is ready.

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
  // Discovery reads v_public_event_cards; at minimum the shell renders.
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
    test.skip(true, "No public events in this environment — needs seeded data (TICK-181 staging).")
  }

  // Navigate via the href rather than clicking: event cards live in horizontally
  // scrollable rows, so the "first" match can be off-screen / not clickable even
  // though the link is valid. This keeps the smoke check about routing, not layout.
  const href = await firstEvent.getAttribute("href")
  expect(href, "event card should have an href").toBeTruthy()
  // The event detail page should return 2xx and render (not a 404/error shell).
  // Assert routing + a visible heading rather than exact CTA markup, so the
  // smoke stays robust across environments and design tweaks.
  const res = await page.goto(href!)
  expect(res?.ok(), "event detail page should return 2xx").toBeTruthy()
  await expect(page).toHaveURL(/\/events\//)
  // Assert the event title rendered (has text). Not toBeVisible: the hero
  // heading is animated/visibility:hidden at first paint on production.
  await expect(page.locator("h1").first()).toHaveText(/\S/)
})

test("seeded checkout prerequisites are present when strict E2E is enabled", async () => {
  test.skip(!STRICT_E2E, "Set E2E_STRICT=1 once seeded staging is ready to make credentialed checkout blocking.")
  expect(missingSeededCheckoutEnv()).toEqual([])
})

test.describe("seeded guest checkout → hosted payment handoff", () => {
  const missing = missingSeededCheckoutEnv()

  test.skip(
    missing.length > 0 && !STRICT_E2E,
    `Requires seeded staging env: ${missing.join(", ")}.`,
  )

  test("creates a checkout attempt for the seeded event", async ({ page }) => {
    expect(missing, "Seeded checkout environment must be complete.").toEqual([])

    const eventSlug = process.env.E2E_TEST_EVENT_SLUG!
    const buyerEmail = process.env.E2E_TEST_BUYER_EMAIL!

    await page.goto(`/events/${encodeURIComponent(eventSlug)}`)
    await expect(page.locator("h1").first()).toHaveText(/\S/)

    const checkoutCta = page.getByRole("button", { name: /continue|get tickets/i }).last()
    await expect(checkoutCta).toBeEnabled()
    await checkoutCta.click()
    await page.waitForURL(/\/events\/[^/]+\/checkout/)

    await page.getByLabel(/send ticket to|email/i).first().fill(buyerEmail)
    await page.locator('input[type="checkbox"]').last().check()

    const paymentCta = page.getByRole("button", { name: /pay|continue to payment/i }).last()
    await expect(paymentCta).toBeEnabled()
    await paymentCta.click()

    await page.waitForURL(/checkout\.paystack\.com|\/orders\/[^/]+\/confirmation/, {
      timeout: 30_000,
    })
  })
})
