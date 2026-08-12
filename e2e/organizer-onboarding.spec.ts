import { randomBytes, randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  createUatAdmin,
  readAuthenticatedUatConfig,
  signInUatPersona,
} from "./support/uat-auth"

// TICK-334 — prove a newly verified Ticketiv account can become an organizer
// through the real onboarding flow without relying on the fixed shared fixture.
//
// This suite creates one ephemeral @uat.ticketiv.invalid auth user and one
// uniquely named organization. It selects ZAR explicitly (the current Paystack
// launch path), verifies organizer-owner membership and context routing, then
// removes only those exact synthetic records plus the matching rate-limit row.

const config = readAuthenticatedUatConfig()
const RUN_ID = randomUUID()
const ORGANIZATION_NAME = `E2E TICK-334 Onboarding ${RUN_ID}`
const EMAIL = `tick334-onboarding-${RUN_ID}@uat.ticketiv.invalid`
const PASSWORD = `Tiv-${randomBytes(24).toString("base64url")}!9a`

let admin: SupabaseClient | null = null
let userId: string | null = null
let organizationId: string | null = null

function shouldRun(projectName: string) {
  return config.ready && projectName === "desktop-chromium"
}

async function cleanupSyntheticOnboarding() {
  if (!admin) return

  const organizationIds = new Set<string>()
  if (organizationId) organizationIds.add(organizationId)

  if (userId) {
    const { data: memberships, error: membershipError } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)

    if (membershipError) throw new Error(`Unable to resolve onboarding memberships: ${membershipError.message}`)

    const candidateIds = (memberships ?? []).map((row) => row.org_id).filter(Boolean)
    if (candidateIds.length > 0) {
      const { data: organizations, error: organizationsError } = await admin
        .from("organizations")
        .select("id,name")
        .in("id", candidateIds)
        .eq("name", ORGANIZATION_NAME)

      if (organizationsError) throw new Error(`Unable to resolve onboarding organization: ${organizationsError.message}`)
      for (const organization of organizations ?? []) organizationIds.add(organization.id)
    }
  }

  for (const id of organizationIds) {
    const { error: membersError } = await admin.from("org_members").delete().eq("org_id", id)
    if (membersError) throw new Error(`Unable to remove onboarding membership: ${membersError.message}`)

    const { error: organizationError } = await admin.from("organizations").delete().eq("id", id)
    if (organizationError) throw new Error(`Unable to remove onboarding organization: ${organizationError.message}`)
  }

  if (!userId) return

  const bucket = `org_create:${userId}`
  const { error: rateLimitError } = await admin.from("rate_limits").delete().eq("bucket", bucket)
  if (rateLimitError) throw new Error(`Unable to remove onboarding rate-limit row: ${rateLimitError.message}`)

  const { error: notificationError } = await admin.from("notifications").delete().eq("user_id", userId)
  if (notificationError) throw new Error(`Unable to remove onboarding notifications: ${notificationError.message}`)

  const { error: profileError } = await admin.from("profiles").delete().eq("user_id", userId)
  if (profileError) throw new Error(`Unable to remove onboarding profile: ${profileError.message}`)

  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) throw new Error(`Unable to remove onboarding auth user: ${authError.message}`)
}

test.describe("organizer onboarding", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name)) return

    admin = createUatAdmin(config)
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: "E2E",
        last_name: "Organizer",
      },
    })

    if (error) throw new Error(`Unable to create onboarding UAT user: ${error.message}`)
    if (!data.user?.id) throw new Error("Supabase did not return the onboarding UAT user id.")
    userId = data.user.id
  })

  test.afterAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name) || !admin) return
    await cleanupSyntheticOnboarding()
  })

  test("verified attendee creates an organization and becomes its owner", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Organizer onboarding UAT requires E2E_STRICT=1, E2E_ALLOW_SHARED_UAT=1 and allow-listed TEST_SUPABASE_* env; runs on desktop only.",
    )

    if (!admin || !userId || !config.baseUrl) {
      throw new Error("Organizer onboarding UAT setup did not initialize.")
    }

    await signInUatPersona({
      page,
      email: EMAIL,
      password: PASSWORD,
      baseUrl: config.baseUrl,
      nextPath: "/onboarding/organizer",
    })

    await expect(page.getByRole("heading", { name: /Create your organisation to start hosting/i })).toBeVisible()
    await page.getByLabel("Organisation name *").fill(ORGANIZATION_NAME)
    await page.getByLabel("Default currency").selectOption("ZAR")
    await page.getByRole("button", { name: "Create organisation" }).click()

    await page.waitForURL((url) => /^\/orgs\/[0-9a-f-]+\/events\/new$/i.test(url.pathname), { timeout: 30_000 })
    const match = new URL(page.url()).pathname.match(/^\/orgs\/([0-9a-f-]+)\/events\/new$/i)
    expect(match, "organizer onboarding should continue into first-event creation").not.toBeNull()
    organizationId = match?.[1] ?? null
    if (!organizationId) throw new Error("Unable to resolve the newly created organizer workspace id.")

    await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible()

    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .select("id,name,default_currency")
      .eq("id", organizationId)
      .single()

    expect(organizationError, organizationError?.message).toBeNull()
    expect(organization).toMatchObject({
      id: organizationId,
      name: ORGANIZATION_NAME,
      default_currency: "ZAR",
    })

    const { data: membership, error: membershipError } = await admin
      .from("org_members")
      .select("org_id,user_id,role")
      .eq("org_id", organizationId)
      .eq("user_id", userId)
      .single()

    expect(membershipError, membershipError?.message).toBeNull()
    expect(membership).toMatchObject({
      org_id: organizationId,
      user_id: userId,
      role: "organizer_owner",
    })

    await page.goto("/organizer")
    await page.waitForURL(new RegExp(`/orgs/${organizationId}/dashboard$`), { timeout: 30_000 })
  })
})

test.describe("organizer onboarding UAT harness", () => {
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
