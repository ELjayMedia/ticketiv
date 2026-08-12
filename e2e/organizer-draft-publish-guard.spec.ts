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

// TICK-334 — prove the launch-critical organizer entry path without ever
// publishing into the shared production-backed Supabase project.
//
// The browser creates one uniquely named private draft through Ticketiv's real
// organizer UI, opens the Publish step, and proves both the disabled UI and the
// server route refuse publication while required readiness checks are missing.
// The exact draft is deleted before the fixed UAT fixture teardown runs.

const config = readAuthenticatedUatConfig()
const OWNER = UAT_PERSONAS.owner
const DRAFT_TITLE = `E2E TICK-334 draft ${randomUUID()}`

let admin: SupabaseClient | null = null
let password: string | null = null
let draftEventId: string | null = null
let seeded = false

function shouldRun(projectName: string) {
  return config.ready && projectName === "desktop-chromium"
}

async function cleanupDraft() {
  if (!admin) return

  let query = admin
    .from("events")
    .delete()
    .eq("org_id", UAT_ORGS.alpha)
    .eq("title", DRAFT_TITLE)

  if (draftEventId) query = query.eq("id", draftEventId)

  const { error } = await query
  if (error) throw new Error(`Unable to remove organizer E2E draft: ${error.message}`)
}

test.describe("organizer draft creation and publish guard", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name)) return

    admin = createUatAdmin(config)
    await seedUatFixtures(admin)
    seeded = true
    password = await provisionUatPassword(admin, OWNER)
  })

  test.afterAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name) || !admin || !seeded) return

    try {
      await cleanupDraft()
    } finally {
      await teardownUatFixtures(admin)
    }
  })

  test("owner creates a private draft and incomplete readiness blocks publication", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Organizer UAT requires E2E_STRICT=1, E2E_ALLOW_SHARED_UAT=1 and allow-listed TEST_SUPABASE_* env; runs on desktop only.",
    )

    if (!password || !admin || !config.baseUrl) {
      throw new Error("Organizer UAT setup did not initialize.")
    }

    const newEventPath = `/orgs/${UAT_ORGS.alpha}/events/new`
    await signInUatPersona({
      page,
      email: OWNER.email,
      password,
      baseUrl: config.baseUrl,
      nextPath: newEventPath,
    })

    await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible()
    await page.getByLabel("Event name").fill(DRAFT_TITLE)
    await page.getByRole("button", { name: /Continue to Basics/i }).click()

    await page.waitForURL((url) =>
      url.pathname.startsWith(`/orgs/${UAT_ORGS.alpha}/events/`) &&
      url.pathname.endsWith("/edit") &&
      url.searchParams.get("step") === "basics",
    )

    const match = new URL(page.url()).pathname.match(
      new RegExp(`^/orgs/${UAT_ORGS.alpha}/events/([0-9a-f-]+)/edit$`, "i"),
    )
    expect(match, "draft creation should redirect to the event editor").not.toBeNull()
    draftEventId = match?.[1] ?? null
    if (!draftEventId) throw new Error("Unable to resolve the created draft event id.")

    const { data: created, error: createdError } = await admin
      .from("events")
      .select("id,org_id,title,status,visibility")
      .eq("id", draftEventId)
      .single()

    expect(createdError, createdError?.message).toBeNull()
    expect(created).toMatchObject({
      id: draftEventId,
      org_id: UAT_ORGS.alpha,
      title: DRAFT_TITLE,
      status: "draft",
    })
    expect(created?.visibility).not.toBe("public")

    await page.goto(`/orgs/${UAT_ORGS.alpha}/events/${draftEventId}/edit?step=publish`)
    await expect(page.getByRole("heading", { name: "Publish event" })).toBeVisible()
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/required left$/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "Publish event" })).toBeDisabled()

    // The UI guard is not the security boundary. Call the authenticated route
    // directly as the owner and prove the server independently rejects it.
    const publishResponse = await page.request.put(
      new URL(`/api/events/${draftEventId}/publish`, config.baseUrl).toString(),
      { data: { publish: true } },
    )
    expect(publishResponse.status()).toBe(400)

    const publishBody = (await publishResponse.json()) as {
      error?: string
      readiness?: {
        ready?: boolean
        checks?: Array<{ complete?: boolean; recommended?: boolean }>
      }
    }
    expect(publishBody.error).toBe("Complete the readiness checklist before publishing.")
    expect(publishBody.readiness?.ready).toBe(false)
    expect(
      publishBody.readiness?.checks?.some((check) => !check.recommended && !check.complete),
    ).toBe(true)

    const { data: after, error: afterError } = await admin
      .from("events")
      .select("status,visibility,published_at")
      .eq("id", draftEventId)
      .single()

    expect(afterError, afterError?.message).toBeNull()
    expect(after?.status).toBe("draft")
    expect(after?.visibility).not.toBe("public")
    expect(after?.published_at).toBeNull()
  })
})

test.describe("organizer draft UAT harness", () => {
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
