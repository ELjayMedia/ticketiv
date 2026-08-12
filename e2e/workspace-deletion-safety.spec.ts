import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"
import type { SupabaseClient } from "@supabase/supabase-js"

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

// TICK-334 — workspace deletion safety on the shared UAT target.
//
// The fixed Alpha workspace already has event/order/payout dependencies, so it
// is used only as a protected negative case. A uniquely named, otherwise empty
// synthetic workspace is created for the same fixed owner, deleted through the
// real Workspace settings UI/server action, then independently verified absent.
// Cleanup removes only that exact synthetic id if the browser leg fails.

const config = readAuthenticatedUatConfig()
const OWNER = UAT_PERSONAS.owner
const suffix = randomUUID().replaceAll("-", "").slice(0, 12)
const EMPTY_ORG_NAME = `E2E Delete Workspace ${suffix}`
const EMPTY_ORG_SLUG = `e2e-delete-${suffix}`

let admin: SupabaseClient | null = null
let password: string | null = null
let emptyOrgId: string | null = null
let seeded = false

function shouldRun(projectName: string) {
  return config.ready && projectName === "desktop-chromium"
}

async function cleanupSyntheticWorkspace() {
  if (!admin || !emptyOrgId) return

  const { error: memberError } = await admin.from("org_members").delete().eq("org_id", emptyOrgId)
  if (memberError) throw new Error(`Unable to remove synthetic workspace membership: ${memberError.message}`)

  const { error: orgError } = await admin.from("organizations").delete().eq("id", emptyOrgId)
  if (orgError) throw new Error(`Unable to remove synthetic workspace: ${orgError.message}`)
}

test.describe("workspace deletion safety", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name)) return

    admin = createUatAdmin(config)
    await seedUatFixtures(admin)
    seeded = true
    password = await provisionUatPassword(admin, OWNER)

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: EMPTY_ORG_NAME, slug: EMPTY_ORG_SLUG, default_currency: "ZAR" })
      .select("id,name,slug")
      .single()

    if (orgError) throw new Error(`Unable to create synthetic empty workspace: ${orgError.message}`)
    if (!org?.id) throw new Error("Synthetic empty workspace did not return an id.")
    emptyOrgId = org.id

    const { error: memberError } = await admin.from("org_members").insert({
      org_id: emptyOrgId,
      user_id: OWNER.id,
      role: "organizer_owner",
    })
    if (memberError) throw new Error(`Unable to attach UAT owner to synthetic workspace: ${memberError.message}`)
  })

  test.afterAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name) || !admin || !seeded) return

    try {
      await cleanupSyntheticWorkspace()
    } finally {
      await teardownUatFixtures(admin)
    }
  })

  test("non-empty workspace exposes dependency protection instead of deletion", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Workspace deletion UAT requires E2E_STRICT=1, E2E_ALLOW_SHARED_UAT=1 and allow-listed TEST_SUPABASE_* env; runs on desktop only.",
    )

    if (!password || !config.baseUrl) throw new Error("Workspace deletion UAT setup did not initialize.")

    const settingsPath = `/orgs/${UAT_ORGS.alpha}/settings`
    await signInUatPersona({
      page,
      email: OWNER.email,
      password,
      baseUrl: config.baseUrl,
      nextPath: settingsPath,
    })

    await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible()
    await expect(page.getByText(/This workspace has \d+ events?\./)).toBeVisible()
    await expect(page.getByRole("link", { name: "Manage events" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Delete workspace" })).toHaveCount(0)
  })

  test("owner deletes only the explicitly confirmed empty synthetic workspace", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Workspace deletion UAT requires the explicit shared-UAT safety gate.",
    )

    if (!password || !admin || !config.baseUrl || !emptyOrgId) {
      throw new Error("Workspace deletion UAT setup did not initialize.")
    }

    const settingsPath = `/orgs/${emptyOrgId}/settings`
    await signInUatPersona({
      page,
      email: OWNER.email,
      password,
      baseUrl: config.baseUrl,
      nextPath: settingsPath,
    })

    await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible()
    await page.getByRole("button", { name: "Delete workspace" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: `Delete ${EMPTY_ORG_NAME}?` })).toBeVisible()

    const confirmation = dialog.locator('input[name="confirmation"]')
    const deleteButton = dialog.getByRole("button", { name: "Delete permanently" })

    await confirmation.fill(`${EMPTY_ORG_NAME} wrong`)
    await expect(deleteButton).toBeDisabled()

    await confirmation.fill(EMPTY_ORG_NAME)
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()

    await page.waitForURL(
      (url) =>
        url.pathname === `/orgs/${UAT_ORGS.alpha}/dashboard` ||
        url.pathname === "/organizer",
      { timeout: 30_000 },
    )

    const { data: deletedOrg, error: orgError } = await admin
      .from("organizations")
      .select("id")
      .eq("id", emptyOrgId)
      .maybeSingle()
    expect(orgError, orgError?.message).toBeNull()
    expect(deletedOrg).toBeNull()

    const { count: memberCount, error: memberError } = await admin
      .from("org_members")
      .select("org_id", { count: "exact", head: true })
      .eq("org_id", emptyOrgId)
    expect(memberError, memberError?.message).toBeNull()
    expect(memberCount).toBe(0)
  })
})

test.describe("workspace deletion UAT harness", () => {
  test("stays inert unless the shared target is explicitly acknowledged", () => {
    if (config.ready) {
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
