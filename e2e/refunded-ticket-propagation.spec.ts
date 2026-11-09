import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  createUatAdmin,
  provisionUatLogin,
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
// The attendee UI reads through the security-invoker v_my_tickets view. Use
// the public discovery fixture so its event and ticket type are intentionally
// visible to an attendee; the unlisted organiser fixture is not public catalog
// data and is correctly hidden by its underlying RLS policies.
const PUBLIC_EVENT_ID = "da7a0003-0000-4000-8000-000000000004"
const PUBLIC_TICKET_TYPE_ID = "da7a0004-0000-4000-8000-000000000004"

type RefundedTicket = {
  id: string
  ticket_code: string
  status: string
  checked_in_at: string | null
}

let admin: SupabaseClient | null = null
let login: Awaited<ReturnType<typeof provisionUatLogin>> | null = null
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
    login = await provisionUatLogin(admin, BUYER)

    const fixtureKey = randomUUID()
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        org_id: "da7a0000-0000-4000-8000-000000000001",
        buyer_id: login.id,
        buyer_email: login.email,
        email: login.email,
        total_cents: 15000,
        subtotal_cents: 15000,
        item_count: 1,
        currency: "ZAR",
        status: "paid",
        channel: "online",
      })
      .select("id")
      .single()
    if (orderError || !order) throw new Error(`Unable to create refunded UAT order: ${orderError?.message}`)

    const { data: item, error: itemError } = await admin
      .from("order_items")
      .insert({
        order_id: order.id,
        ticket_type_id: PUBLIC_TICKET_TYPE_ID,
        ticket_code: `UAT-REFUND-${fixtureKey}`,
        status: "issued",
      })
      .select("id,ticket_code,status,checked_in_at")
      .single()
    if (itemError || !item) throw new Error(`Unable to create refunded UAT ticket: ${itemError?.message}`)

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        order_id: order.id,
        provider: "paystack",
        amount_cents: 15000,
        currency: "ZAR",
        ext_payment_id: `uat_refund_${fixtureKey}`,
        status: "succeeded",
        channel: "online",
      })
      .select("id")
      .single()
    if (paymentError || !payment) throw new Error(`Unable to create refunded UAT payment: ${paymentError?.message}`)

    const { data: refund, error: refundError } = await admin
      .from("refunds")
      .insert({ payment_id: payment.id, amount_cents: 15000, currency: "ZAR", status: "requested" })
      .select("id")
      .single()
    if (refundError || !refund) throw new Error(`Unable to create refunded UAT refund: ${refundError?.message}`)

    const { error: processError } = await admin.from("refunds").update({ status: "processed" }).eq("id", refund.id)
    if (processError) throw new Error(`Unable to process refunded UAT refund: ${processError.message}`)

    const { data, error } = await admin
      .from("order_items")
      .select("id,ticket_code,status,checked_in_at")
      .eq("id", item.id)
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

    if (!login || !refundedTicket || !config.baseUrl) {
      throw new Error("Refunded-ticket UAT setup did not initialize.")
    }

    await signInUatPersona({
      page,
      email: login.email,
      password: login.password,
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
      p_event_id: PUBLIC_EVENT_ID,
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
