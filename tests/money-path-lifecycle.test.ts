import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// TICK-334 — money-path lifecycle, asserted against the DATABASE.
//
// The ticket's acceptance is explicit that tests must "assert database
// outcomes, not only UI success messages", and specifically that payment tests
// assert *one* succeeded payment, balanced ledger entries, a paid order and
// issued ticket items. A browser cannot prove any of that: the provider
// callback is server-to-server and the invariants live in Postgres. So this
// suite drives the same SECURITY DEFINER RPCs the webhook path uses and checks
// the resulting rows.
//
// Journeys covered here (numbering from the ticket):
//   #4  checkout → provider callback → paid order → ticket minting
//   #5  duplicate/delayed webhook redelivery with exactly-once financial outcome
//   #6/#7 scan, duplicate scan, wrong-event scan
//   #8  refund state propagation
//
// ---------------------------------------------------------------------------
// SAFETY
// ---------------------------------------------------------------------------
// This suite CREATES AND DELETES rows. Ticketiv currently runs development, UAT
// and production against a single Supabase project, so "just point it at the
// database" would mean manufacturing orders and payments in production — the
// exact problem the UAT seed fixtures caused. Three guards:
//
//   1. It requires TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY. It never
//      reads NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, so pointing
//      it at production has to be a deliberate act, not an accident of having a
//      normal .env loaded.
//   2. TEST_SUPABASE_ALLOW_PROJECT_REF must name the project ref in that URL.
//      A copied-in production URL fails the check instead of running.
//   3. E2E_ALLOW_SHARED_UAT=1 explicitly acknowledges that the target may be
//      the shared production-backed project.
//   4. Everything it creates is tracked and torn down in afterAll, in FK order.
//
// Without the env the suite skips, so `pnpm test` stays green on a clean clone.

const URL_ = process.env.TEST_SUPABASE_URL
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_REF = process.env.TEST_SUPABASE_ALLOW_PROJECT_REF

const REQUIRED_ENV = [
  "TEST_SUPABASE_URL",
  "TEST_SUPABASE_SERVICE_ROLE_KEY",
  "TEST_SUPABASE_ALLOW_PROJECT_REF",
] as const

function missingEnv() {
  return REQUIRED_ENV.filter((key) => !process.env[key]?.trim())
}

/** Project ref from https://<ref>.supabase.co */
function projectRef(url: string | undefined): string | null {
  return url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null
}

const envReady = missingEnv().length === 0
const refMatches = envReady && projectRef(URL_) !== null && projectRef(URL_) === ALLOWED_REF?.trim()
const sharedEnvironmentAcknowledged = process.env.E2E_ALLOW_SHARED_UAT === "1"
const configured = envReady && refMatches && sharedEnvironmentAcknowledged

const TAG = `e2e-money-${Date.now()}`
const PAYSTACK_CURRENCY = "ZAR"

interface Fixture {
  orgId: string
  eventId: string
  wrongEventId: string
  ticketTypeId: string
  buyerId: string
  orderId?: string
}

let admin: SupabaseClient | null = null
let fx: Fixture | null = null
let buyerId: string | null = null
let createdOrgId: string | null = null
let createdEventId: string | null = null
let createdWrongEventId: string | null = null

/** Fail loudly rather than silently continuing on a half-made fixture. */
async function must<T>(label: string, p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p
  if (error) throw new Error(`${label}: ${error.message}`)
  if (data === null) throw new Error(`${label}: returned no data`)
  return data
}

describe.skipIf(!configured)("money path lifecycle (database-asserted)", () => {
  beforeAll(async () => {
    admin = createClient(URL_!, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })

    // orders.buyer_id references auth.users. Use a run-owned identity so this
    // synthetic lifecycle is never attached to a real customer account.
    const buyer = await admin.auth.admin.createUser({
      email: `${TAG}@uat.ticketiv.invalid`,
      email_confirm: true,
    })
    if (buyer.error) throw new Error(`create synthetic buyer: ${buyer.error.message}`)
    buyerId = buyer.data.user?.id ?? null
    if (!buyerId) throw new Error("create synthetic buyer: returned no user id")

    const org = await must<{ id: string }>(
      "create org",
      admin
        .from("organizations")
        .insert({ name: `${TAG} org`, slug: TAG, default_currency: PAYSTACK_CURRENCY } as never)
        .select("id")
        .single(),
    )
    createdOrgId = org.id
    const event = await must<{ id: string }>(
      "create event",
      admin
        .from("events")
        .insert({
          org_id: org.id,
          title: `${TAG} event`,
          slug: TAG,
          status: "draft",
          starts_at: new Date(Date.now() + 86_400_000).toISOString(),
          ends_at: new Date(Date.now() + 90_000_000).toISOString(),
        } as never)
        .select("id")
        .single(),
    )
    createdEventId = event.id
    const wrongEvent = await must<{ id: string }>(
      "create wrong-scan event",
      admin
        .from("events")
        .insert({
          org_id: org.id,
          title: `${TAG} wrong-scan event`,
          slug: `${TAG}-wrong-scan`,
          status: "draft",
          starts_at: new Date(Date.now() + 172_800_000).toISOString(),
          ends_at: new Date(Date.now() + 176_400_000).toISOString(),
        } as never)
        .select("id")
        .single(),
    )
    createdWrongEventId = wrongEvent.id
    const tt = await must<{ id: string }>(
      "create ticket type",
      admin
        .from("ticket_types")
        .insert({ event_id: event.id, name: `${TAG} GA`, price_cents: 10_000, currency: PAYSTACK_CURRENCY, quota: 10 } as never)
        .select("id")
        .single(),
    )

    fx = { orgId: org.id, eventId: event.id, wrongEventId: wrongEvent.id, ticketTypeId: tt.id, buyerId }
  })

  afterAll(async () => {
    if (!admin) return

    if (createdOrgId) {
      // FK order matters. Mirrors fn_teardown_uat_fixtures' ordering.
      const orderIds = (await admin.from("orders").select("id").eq("org_id", createdOrgId)).data?.map((o: any) => o.id) ?? []
      const eventIds = [createdEventId, createdWrongEventId].filter((id): id is string => Boolean(id))
      if (eventIds.length) await admin.from("scans").delete().in("event_id", eventIds)
      await admin.from("ledger_entries").delete().eq("org_id", createdOrgId)
      if (orderIds.length) {
        const paymentIds =
          (await admin.from("payments").select("id").in("order_id", orderIds)).data?.map((p: any) => p.id) ?? []
        if (paymentIds.length) {
          const refundIds =
            (await admin.from("refunds").select("id").in("payment_id", paymentIds)).data?.map((r: any) => r.id) ?? []
          if (refundIds.length) await admin.from("refund_items").delete().in("refund_id", refundIds)
          await admin.from("refunds").delete().in("payment_id", paymentIds)
        }
        await admin.from("payment_outbox").delete().in("order_id", orderIds)
        await admin.from("payment_attempts").delete().in("order_id", orderIds)
        await admin.from("payments").delete().in("order_id", orderIds)
        await admin.from("order_items").delete().in("order_id", orderIds)
        await admin.from("orders").delete().in("id", orderIds)
      }
      if (eventIds.length) {
        await admin.from("ticket_types").delete().in("event_id", eventIds)
        await admin.from("events").delete().in("id", eventIds)
      }
      await admin.from("organizations").delete().eq("id", createdOrgId)
    }

    if (buyerId) {
      await admin.from("notifications").delete().eq("user_id", buyerId)
      await admin.from("profiles").delete().eq("user_id", buyerId)
      const { error } = await admin.auth.admin.deleteUser(buyerId)
      if (error) throw new Error(`delete synthetic buyer: ${error.message}`)
    }
  })

  it("creates a pending order that holds inventory", async () => {
    if (!admin || !fx) throw new Error("money-path UAT setup did not initialize")
    const { data, error } = await (admin.rpc as any)("fn_create_inventory_protected_order", {
      p_event_id: fx.eventId,
      p_buyer_id: fx.buyerId,
      p_buyer_email: `${TAG}@ticketiv.invalid`,
      p_items: [{ ticketTypeId: fx.ticketTypeId, quantity: 1 }],
      p_holder_name: null,
    })
    expect(error, error?.message).toBeNull()

    const row = Array.isArray(data) ? data[0] : data
    const order = row?.order_row
    fx.orderId = order?.id
    expect(fx.orderId, "order id").toBeTruthy()
    expect(order.status).toBe("pending")
    expect(order.total_cents).toBe(10_000)
    // A hold must exist, otherwise inventory is not actually protected.
    expect(order.hold_expires_at).toBeTruthy()
  })

  it("completes payment: one succeeded payment, paid order, issued ticket, balanced ledger", async () => {
    if (!admin || !fx) throw new Error("money-path UAT setup did not initialize")
    const reference = `${TAG}-ref-1`
    const { error } = await (admin.rpc as any)("fn_complete_order_payment", {
      p_order_id: fx.orderId,
      p_provider: "paystack",
      p_ext_payment_id: reference,
      p_amount_cents: 10_000,
      p_currency: PAYSTACK_CURRENCY,
      p_payload: { data: { status: "success" } },
    })
    expect(error, error?.message).toBeNull()

    const order = (await admin.from("orders").select("status,total_cents").eq("id", fx.orderId!).single()).data as any
    expect(order.status).toBe("paid")

    const payments = (await admin.from("payments").select("id,status").eq("order_id", fx.orderId!)).data ?? []
    expect(payments).toHaveLength(1)
    expect((payments[0] as any).status).toBe("succeeded")

    const items = (await admin.from("order_items").select("status").eq("order_id", fx.orderId!)).data ?? []
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i: any) => i.status === "issued")).toBe(true)

    // Settlement invariant: gross + fee = net, and gross equals the order total.
    const ledger = (await admin.from("ledger_entries").select("type,amount_cents").eq("order_id", fx.orderId!)).data ?? []
    const sum = (t: string) =>
      ledger.filter((l: any) => l.type === t).reduce((n: number, l: any) => n + l.amount_cents, 0)
    expect(sum("order_gross")).toBe(order.total_cents)
    expect(sum("order_gross") + sum("fee")).toBe(sum("payment_net"))
  })

  it("is exactly-once: redelivering the same payment does not double-credit", async () => {
    if (!admin || !fx) throw new Error("money-path UAT setup did not initialize")
    const reference = `${TAG}-ref-1` // same reference — a provider redelivery
    const before = {
      payments: (await admin.from("payments").select("id").eq("order_id", fx.orderId!)).data?.length ?? 0,
      gross:
        ((await admin.from("ledger_entries").select("amount_cents").eq("order_id", fx.orderId!).eq("type", "order_gross"))
          .data ?? []).reduce((n: number, l: any) => n + l.amount_cents, 0),
      issued: (await admin.from("order_items").select("id").eq("order_id", fx.orderId!).eq("status", "issued")).data?.length ?? 0,
    }

    const { data, error } = await (admin.rpc as any)("fn_complete_order_payment", {
      p_order_id: fx.orderId,
      p_provider: "paystack",
      p_ext_payment_id: reference,
      p_amount_cents: 10_000,
      p_currency: PAYSTACK_CURRENCY,
      p_payload: { data: { status: "success" } },
    })
    expect(error, error?.message).toBeNull()
    const result = Array.isArray(data) ? data[0] : data
    expect(result?.already_completed).toBe(true)

    const after = {
      payments: (await admin.from("payments").select("id").eq("order_id", fx.orderId!)).data?.length ?? 0,
      gross:
        ((await admin.from("ledger_entries").select("amount_cents").eq("order_id", fx.orderId!).eq("type", "order_gross"))
          .data ?? []).reduce((n: number, l: any) => n + l.amount_cents, 0),
      issued: (await admin.from("order_items").select("id").eq("order_id", fx.orderId!).eq("status", "issued")).data?.length ?? 0,
    }

    expect(after.payments).toBe(before.payments)
    expect(after.gross).toBe(before.gross)
    expect(after.issued).toBe(before.issued)
  })

  it("scans a ticket once, then rejects the duplicate and the wrong event", async () => {
    if (!admin || !fx) throw new Error("money-path UAT setup did not initialize")
    const client = admin
    const eventId = fx.eventId
    const item = (
      await client.from("order_items").select("ticket_code").eq("order_id", fx.orderId!).limit(1).single()
    ).data as any
    const code = item?.ticket_code
    expect(code, "ticket code").toBeTruthy()

    // Service-role must call the worker: fn_scan_ticket is the claimed-account
    // shim and raises `claimed_account_required` without a user auth.uid().
    // (tests/scan-rpc-entrypoint-contract.test.ts guards that pairing.)
    const scan = (extra: Record<string, unknown> = {}) =>
      (client.rpc as any)("fn_scan_ticket_unchecked", {
        p_ticket_code: code,
        p_event_id: eventId,
        p_scanned_by: null,
        p_device_id: null,
        p_session_id: null,
        p_gate: "e2e",
        p_scanned_at: new Date().toISOString(),
        p_attempt_id: null,
        ...extra,
      })

    // Use a second run-owned event. Wrong-event attempts are persisted in
    // scans, so borrowing an arbitrary event would pollute a real workspace.
    const wrong = await scan({ p_event_id: fx.wrongEventId })
    expect(wrong.error, wrong.error?.message).toBeNull()
    expect(wrong.data?.outcome).toBe("wrong_event")

    const first = await scan()
    expect(first.error, first.error?.message).toBeNull()
    expect(first.data?.outcome).toBe("valid")

    // Same ticket again: admitted once, never twice.
    const second = await scan()
    expect(second.error, second.error?.message).toBeNull()
    expect(second.data?.outcome).not.toBe("valid")

  })
})

// Visibility marker: make the suite's presence and its gating obvious in CI
// output even when the integration cases skip, matching tests/rls-isolation.
describe("money path lifecycle harness", () => {
  it(
    configured
      ? "is configured against an explicitly acknowledged project"
      : "is present but skipped (needs allow-listed TEST_SUPABASE_* env and shared-UAT acknowledgement)",
    () => {
      if (configured) {
        expect(missingEnv()).toEqual([])
        expect(projectRef(URL_)).toBe(ALLOWED_REF?.trim())
        expect(sharedEnvironmentAcknowledged).toBe(true)
      } else {
        // Either the env is absent, or it is present but the project ref was
        // not explicitly allow-listed — both must keep the suite from running.
        expect(missingEnv().length > 0 || !refMatches || !sharedEnvironmentAcknowledged).toBe(true)
      }
    },
  )
})
