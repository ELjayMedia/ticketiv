import { expect, test } from "@playwright/test"
import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js"

import {
  UAT_ORGS,
  UAT_PERSONAS,
  createUatAdmin,
  provisionUatPassword,
  readAuthenticatedUatConfig,
  seedUatFixtures,
  signInUatPersona,
  teardownUatFixtures,
} from "./support/uat-auth"

// TICK-334 — authenticated cross-organization browser boundary.
//
// This suite intentionally runs on desktop only. The authorization invariant is
// server/database-backed, while running the same seed concurrently in both
// Playwright projects would make the shared UAT fixture race with itself.
//
// It is also deliberately opt-in. Ticketiv still shares one Supabase project
// across environments, so the suite requires E2E_ALLOW_SHARED_UAT=1 *and* the
// TEST_SUPABASE project-ref allow-list before it will write fixture rows.

const config = readAuthenticatedUatConfig()
const alphaPersonas = [
  ["owner", UAT_PERSONAS.owner],
  ["admin", UAT_PERSONAS.admin],
  ["finance", UAT_PERSONAS.finance],
  ["scanner", UAT_PERSONAS.scanner],
  ["cashier", UAT_PERSONAS.cashier],
] as const

let admin: SupabaseJsClient | null = null
let seeded = false

function shouldRun(projectName: string) {
  return config.ready && projectName === "desktop-chromium"
}

async function clearBrowserSession(page: Parameters<typeof signInUatPersona>[0]["page"]) {
  await page.context().clearCookies()
  if (!config.baseUrl) return

  await page.goto(new URL("/", config.baseUrl).toString(), { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
}

test.describe("authenticated organization boundaries", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name)) return

    admin = createUatAdmin(config)
    await seedUatFixtures(admin)
    seeded = true
  })

  test.afterAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name) || !admin || !seeded) return
    await teardownUatFixtures(admin)
  })

  test("every Alpha staff role can enter Alpha but is refused from Beta", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Authenticated UAT requires E2E_STRICT=1, E2E_ALLOW_SHARED_UAT=1 and allow-listed TEST_SUPABASE_* env; runs on desktop only.",
    )

    if (!admin || !config.baseUrl) throw new Error("Authenticated UAT setup did not initialize.")

    for (const [role, persona] of alphaPersonas) {
      await test.step(`${role} positive control: Alpha dashboard`, async () => {
        await clearBrowserSession(page)
        const password = await provisionUatPassword(admin!, persona)
        const alphaDashboard = `/orgs/${UAT_ORGS.alpha}/dashboard`

        await signInUatPersona({
          page,
          email: persona.email,
          password,
          baseUrl: config.baseUrl!,
          nextPath: alphaDashboard,
        })

        await expect(page).toHaveURL(new URL(alphaDashboard, config.baseUrl!).toString())
        await expect(page.getByRole("heading", { name: "UAT Alpha Events" })).toBeVisible()
      })

      await test.step(`${role} negative control: Beta is cross-tenant`, async () => {
        await page.goto(`/orgs/${UAT_ORGS.beta}/dashboard`)
        await expect(page).toHaveURL(/\/403(?:\?|$)/)
      })
    }
  })

  test("Beta owner can enter Beta but is refused from Alpha", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Authenticated UAT requires E2E_STRICT=1, E2E_ALLOW_SHARED_UAT=1 and allow-listed TEST_SUPABASE_* env; runs on desktop only.",
    )

    if (!admin || !config.baseUrl) throw new Error("Authenticated UAT setup did not initialize.")

    await clearBrowserSession(page)
    const password = await provisionUatPassword(admin, UAT_PERSONAS.betaOwner)
    const betaDashboard = `/orgs/${UAT_ORGS.beta}/dashboard`

    await signInUatPersona({
      page,
      email: UAT_PERSONAS.betaOwner.email,
      password,
      baseUrl: config.baseUrl,
      nextPath: betaDashboard,
    })

    await expect(page).toHaveURL(new URL(betaDashboard, config.baseUrl).toString())
    await expect(page.getByRole("heading", { name: "UAT Beta Events" })).toBeVisible()

    await page.goto(`/orgs/${UAT_ORGS.alpha}/dashboard`)
    await expect(page).toHaveURL(/\/403(?:\?|$)/)
  })
})

test.describe("authenticated UAT harness", () => {
  test("is safely gated when the shared test target is not explicitly acknowledged", async () => {
    if (config.ready) {
      expect(config.missing).toEqual([])
      expect(config.sharedEnvironmentAcknowledged).toBe(true)
      expect(config.projectRefMatches).toBe(true)
      expect(config.baseUrl).toBeTruthy()
      return
    }

    expect(
      config.missing.length > 0 ||
        !config.sharedEnvironmentAcknowledged ||
        !config.projectRefMatches ||
        process.env.E2E_STRICT !== "1",
    ).toBe(true)
  })
})
