import { expect, test } from "@playwright/test"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  createUatAdmin,
  provisionUatPassword,
  readAuthenticatedUatConfig,
  seedUatFixtures,
  signInUatPersona,
  teardownUatFixtures,
} from "./support/uat-auth"

// TICK-334 — refund state must reach both the attendee UI and the gate path.
//
// The fixed UAT fixture already contains a fully processed refund. This suite
// consumes that state rather than issuing a provider refund, so it never moves
// real money. It is guarded by the same explicit shared-environment opt-in as
// the authenticated cross-org suite and runs on desktop only to avoid racing
// the deterministic seed/reset RPC from two Playwright projects.

const config = readAuthenticatedUatConfig()
const BUYER = {
  id: "da7a0001-0000-4000-8000-000000000006",
  email: "uat-buyer1@uat.ticketiv.invalid",
} as const
const SCANNER_USER_ID = "da7a0001-0000-4000-8000-000000000004"
const ALPHA_EVENT_ID = "da7a0003-0000-4000-8000-000000000001"
const REFUNDED_ORDER_ID = "da7a0005-0000-4000-8000-000000000005"

type RefundedTicket = {
  id: string
  ticket_code: string
  status: string
  checked_in_at: string | null
}

let admin: SupabaseClient | null = null
let password: string | null = null
let refundedTicket: RefundedTicket | null = null
let seeded = false

function shouldRun(projectName: string) {
  return config.ready && projectName === "desktop-chromium"
}

test.describe("refunded ticket propagation", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name)) return

    admin = createUatAdmin(config)
    await seedUatFixtures(admin)
    seeded = true
    password = await provisionUatPassword(admin, BUYER)

    const { data, error } = await admin
      .from("order_items")
      .select("id,ticket_code,status,checked_in_at")
      .eq("order_id", REFUNDED_ORDER_ID)
      .single()

    if (error) throw new Error(`Unable to load refunded UAT ticket: ${error.message}`)
    if (!data || data.status !== "refunded") {
      throw new Error(`Refund fixture did not produce a refunded ticket; got ${data?.status ?? "missing"}.`)
    }

    refundedTicket = data as RefundedTicket
  })

  test.afterAll(async ({}, workerInfo) => {
    if (!shouldRun(workerInfo.project.name) || !admin || !seeded) return
    await teardownUatFixtures(admin)
  })

  test("attendee sees Refunded and the ticket detail exposes no QR or transfer/resale action", async ({ page }, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Refunded-ticket UAT requires E2E_STRICT=1, E2E_ALLOW_SHARED_UAT=1 and allow-listed TEST_SUPABASE_* env; runs on desktop only.",
    )

    if (!password || !refundedTicket || !config.baseUrl) {
      throw new Error("Refunded-ticket UAT setup did not initialize.")
    }

    await signInUatPersona({
      page,
      email: BUYER.email,
      password,
      baseUrl: config.baseUrl,
      nextPath: "/tickets",
    })

    await expect(page.getByText("Refunded", { exact: true }).first()).toBeVisible()

    await page.goto(`/tickets/${refundedTicket.id}`)
    await expect(page.getByText("Refunded", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("No QR", { exact: true })).toBeVisible()
    await expect(
      page.getByText("This ticket has been refunded and is no longer valid.", { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /transfer/i })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /resell/i })).toHaveCount(0)
  })

  test("gate validation cannot admit the refunded ticket", async ({}, testInfo) => {
    test.skip(
      !shouldRun(testInfo.project.name),
      "Refunded-ticket UAT requires the explicit shared-UAT safety gate.",
    )

    if (!admin || !refundedTicket) throw new Error("Refunded-ticket UAT setup did not initialize.")

    const { data, error } = await admin.rpc("fn_scan_ticket_unchecked", {
      p_ticket_code: refundedTicket.ticket_code,
      p_event_id: ALPHA_EVENT_ID,
      p_scanned_by: SCANNER_USER_ID,
      p_device_id: null,
      p_session_id: null,
      p_gate: "e2e-refund",
      p_scanned_at: new Date().toISOString(),
      p_attempt_id: null,
    })

    expect(error, error?.message).toBeNull()
    const result = Array.isArray(data) ? data[0] : data
    expect((result as { outcome?: string } | null)?.outcome).not.toBe("valid")

    const { data: after, error: afterError } = await admin
      .from("order_items")
      .select("status,checked_in_at")
      .eq("id", refundedTicket.id)
      .single()

    expect(afterError, afterError?.message).toBeNull()
    expect(after?.status).toBe("refunded")
    expect(after?.checked_in_at).toBeNull()
  })
})

test.describe("refunded ticket UAT harness", () => {
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
