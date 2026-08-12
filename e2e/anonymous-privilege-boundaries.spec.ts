import { expect, test } from "@playwright/test"

// TICK-334 — anonymous privilege boundary coverage.
//
// These probes are deliberately non-destructive and can run against production:
// privileged page routes must redirect before rendering protected content, and
// privileged mutation APIs must reject the caller before parsing/using the
// supplied resource identifiers.

test.describe("anonymous privilege boundaries", () => {
  test("super-admin command centre redirects to the dedicated admin login", async ({ page }) => {
    await page.goto("/super-admin")

    await expect(page).toHaveURL(/\/super-admin\/login(?:\?|$)/)
    await expect(page.getByText("Command centre", { exact: true })).toHaveCount(0)
  })

  test("attendee account workspace redirects to sign in", async ({ page }) => {
    await page.goto("/account")

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test("scanner session creation rejects an anonymous caller before any write", async ({ request }) => {
    const response = await request.post("/api/scanner/session", {
      data: {
        deviceId: "e2e-anonymous-boundary",
        eventId: "00000000-0000-0000-0000-000000000000",
      },
    })

    expect(response.status()).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: "Scanner login required" })
  })

  test("payout requests reject an anonymous caller before org or amount validation", async ({ request }) => {
    const response = await request.post("/api/payouts", {
      data: {
        orgId: "00000000-0000-0000-0000-000000000000",
        amountCents: 1,
      },
    })

    expect(response.status()).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: "Authentication required" })
  })
})
