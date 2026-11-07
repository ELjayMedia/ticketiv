import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  context: { user: { id: "11111111-1111-4111-8111-111111111111", email: "support@example.com" }, role: "support_admin" } as any,
  deliver: vi.fn(),
  inserts: [] as Array<{ table: string; row: any }>,
  updates: [] as Array<{ table: string; row: any }>,
  rows: {} as Record<string, any>,
  rpc: vi.fn(),
  initiateRefund: vi.fn(),
  sendCaseMessage: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT") }) }))
vi.mock("@/lib/payments/refunds", () => ({ initiateRefund: mocks.initiateRefund }))
vi.mock("@/lib/support/chatwoot", () => ({ sendCaseMessage: mocks.sendCaseMessage, resolveCase: vi.fn() }))
vi.mock("@/lib/notifications/ticket-delivery", () => ({ deliverTicketsForOrder: mocks.deliver }))
vi.mock("@/lib/notifications/channels/email", () => ({ sendEmail: vi.fn(async () => ({ status: "sent", ref: "x", provider: "resend" })) }))
vi.mock("@/lib/super-admin/auth", async () => {
  const { canDo } = await import("@/lib/super-admin/console")
  return {
    adminForAction: vi.fn(async (action: any) => (canDo(action, mocks.context.role) ? mocks.context : null)),
  }
})
vi.mock("@/lib/supabase/admin", () => {
  function builder(table: string) {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      is: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: mocks.rows[table] ?? null }),
      single: async () => ({ data: mocks.rows[table] ?? { id: "new" }, error: null }),
      then: (resolve: any) => resolve({ data: mocks.rows[`${table}[]`] ?? [], error: null }),
      insert: (row: any) => {
        mocks.inserts.push({ table, row })
        return { ...chain, then: (resolve: any) => resolve({ error: null }) }
      },
      update: (row: any) => {
        mocks.updates.push({ table, row })
        return { eq: () => ({ then: (resolve: any) => resolve({ error: null }) }) }
      },
    }
    return chain
  }
  return { createAdminClient: () => ({ from: builder, rpc: mocks.rpc, auth: { admin: {} } }) }
})

import {
  approveRefundAction,
  changeBuyerEmailAction,
  pauseSalesAction,
  reissueTicketAction,
  replyToCaseAction,
  resendTicketsAction,
  restoreSettingAction,
  startViewAsAction,
} from "@/app/super-admin/console-actions"
import { chatwootApiUrl, chatwootConfig, chatwootConversationLink, parseConversations, parseMessages } from "@/lib/support/chatwoot-core"
import { attendeeTicketState } from "@/lib/data/admin/console-ops"
import { supportReferenceRow, createPaymentChannelUnavailableError } from "@/lib/payments/errors"
import {
  canDo,
  classifySearch,
  describeChange,
  settingLabel,
  IDLE_RESULT,
  normalizeEmail,
  parseQueueItemKey,
  queueItemKey,
  reasonProblem,
  scannerIsOffline,
  undeliveredOrders,
} from "@/lib/super-admin/console"

const ORDER = "22222222-2222-4222-8222-222222222222"
const ITEM = "33333333-3333-4333-8333-333333333333"
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(values)) data.set(k, v)
  return data
}

describe("console rules", () => {
  it("reads what support typed", () => {
    expect(classifySearch("pay-1a2b3c4d")).toEqual({ kind: "payment_reference", query: "PAY-1A2B3C4D" })
    expect(classifySearch(" Buyer@Example.com ").kind).toBe("email")
    expect(classifySearch("+268 7600 0000").kind).toBe("phone")
    expect(classifySearch("abcd-efgh-jklm").kind).toBe("ticket_code")
    expect(classifySearch(ORDER).kind).toBe("order_id")
    expect(classifySearch("22222222").kind).toBe("order_id")
    expect(classifySearch("Winter Concert").kind).toBe("text")
    expect(classifySearch("a").kind).toBe("empty")
  })

  it("gates each action by role", () => {
    expect(canDo("resend_tickets", "support_admin")).toBe(true)
    expect(canDo("request_refund", "finance_admin")).toBe(true)
    expect(canDo("resend_tickets", "finance_admin")).toBe(false)
    expect(canDo("manage_team", "support_admin")).toBe(false)
    expect(canDo("manage_team", "super_admin")).toBe(true)
    for (const action of ["resend_tickets", "change_buyer_email", "reissue_ticket", "request_refund", "add_note", "manage_team"] as const) {
      expect(canDo(action, "read_only_admin"), action).toBe(false)
    }
    expect(canDo("resend_tickets", null)).toBe(false)
  })

  it("wants a real reason and a real email", () => {
    expect(reasonProblem("ok")).toMatch(/at least 10/)
    expect(reasonProblem("Buyer confirmed on Chatwoot")).toBeNull()
    expect(reasonProblem("x".repeat(501))).toMatch(/under 500/)
    expect(normalizeEmail(" A@B.co ")).toBe("a@b.co")
    expect(normalizeEmail("nope")).toBeNull()
  })

  it("saves the PAY- code with the order it belongs to", () => {
    const error = createPaymentChannelUnavailableError("provider_rejected_initialization", { provider: "paystack", orderId: ORDER, httpStatus: 401 })
    const row = supportReferenceRow(error)
    expect(row.ref).toMatch(/^PAY-[0-9A-F]{8}$/)
    expect(row).toMatchObject({ order_id: ORDER, event_id: null, provider: "paystack", reason: "provider_rejected_initialization" })
    expect(supportReferenceRow(createPaymentChannelUnavailableError("no_matching_route", { orderId: "not-a-uuid" })).order_id).toBeNull()
  })
})

describe("support actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.inserts.length = 0
    mocks.updates.length = 0
    mocks.rows = {}
    mocks.context.role = "support_admin"
    mocks.deliver.mockResolvedValue([{ channel: "email", status: "sent" }])
  })

  it("refuses without a reason, and refuses roles that may not act", async () => {
    expect(await resendTicketsAction(IDLE_RESULT, form({ orderId: ORDER, reason: "short" }))).toMatchObject({ status: "error" })
    mocks.context.role = "read_only_admin"
    expect(await resendTicketsAction(IDLE_RESULT, form({ orderId: ORDER, reason: "Buyer never got the email" }))).toEqual({
      status: "error",
      message: expect.stringMatching(/role can't/),
    })
    expect(mocks.deliver).not.toHaveBeenCalled()
    expect(mocks.inserts).toHaveLength(0)
  })

  it("resends even if already delivered, and logs who and why", async () => {
    const result = await resendTicketsAction(IDLE_RESULT, form({ orderId: ORDER, reason: "Buyer never got the email", toEmail: "New@Example.com" }))
    expect(result).toEqual({ status: "done", message: "Tickets resent. Sent by email." })
    expect(mocks.deliver).toHaveBeenCalledWith(ORDER, { force: true, toEmail: "new@example.com" })
    const audit = mocks.inserts.find((i) => i.table === "audit_log")!.row
    expect(audit).toMatchObject({ actor_id: mocks.context.user.id, table_name: "orders", record_id: ORDER, action: "other" })
    expect(audit.changes).toMatchObject({ business_action: "admin_console", action: "resend_tickets", reason: "Buyer never got the email" })
  })

  it("says plainly when nothing could be sent", async () => {
    mocks.deliver.mockResolvedValue(null)
    expect(await resendTicketsAction(IDLE_RESULT, form({ orderId: ORDER, reason: "Buyer never got the email" }))).toEqual({
      status: "error",
      message: "There are no issued tickets on this order to send.",
    })
  })

  it("changes the buyer email, then resends", async () => {
    mocks.rows.orders = { id: ORDER, org_id: null, buyer_email: "sampel@example.com", email: null }
    const result = await changeBuyerEmailAction(IDLE_RESULT, form({ orderId: ORDER, email: "sample@example.com", reason: "Typo at checkout, buyer confirmed" }))
    expect(result.status).toBe("done")
    expect(mocks.updates).toContainEqual({ table: "orders", row: { buyer_email: "sample@example.com", email: "sample@example.com" } })
    expect(mocks.deliver).toHaveBeenCalledWith(ORDER, { force: true })
  })

  it("reissues only through the guarded function and explains refusals", async () => {
    mocks.rows.order_items = { id: ITEM, order_id: ORDER, ticket_code: "OLD1-OLD2-OLD3" }
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "ticket_not_reissuable" } })
    expect(await reissueTicketAction(IDLE_RESULT, form({ orderId: ORDER, orderItemId: ITEM, reason: "Ticket photo was posted online" }))).toEqual({
      status: "error",
      message: "Only valid tickets that haven't been scanned can be reissued.",
    })
    mocks.rpc.mockResolvedValueOnce({ data: "NEW1-NEW2-NEW3", error: null })
    const ok = await reissueTicketAction(IDLE_RESULT, form({ orderId: ORDER, orderItemId: ITEM, reason: "Ticket photo was posted online" }))
    expect(ok).toMatchObject({ status: "done", message: expect.stringContaining("NEW1-NEW2-NEW3") })
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_reissue_ticket_code", { p_order_item_id: ITEM })
  })
})

describe("console guards", () => {
  it("keeps the new tables and functions away from browsers", () => {
    const sql = read("supabase/migrations/20261106100000_admin_console_phase1.sql")
    for (const table of ["admin_notes", "payment_support_references"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`)
      expect(sql).toContain(`revoke all on public.${table} from anon, authenticated;`)
    }
    for (const fn of ["admin_search_people(text, integer)", "admin_search_orders(text, integer)", "admin_revoke_user_sessions(uuid)", "admin_reissue_ticket_code(uuid)"]) {
      expect(sql).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`)
      expect(sql).toContain(`grant execute on function public.${fn} to service_role;`)
    }
  })

  it("routes every console action through the role and reason gate", () => {
    const source = read("app/super-admin/console-actions.ts")
    const actions = [...source.matchAll(/export async function (\w+)\(/g)].map((m) => m[1])
    expect(actions.length).toBeGreaterThanOrEqual(11)
    for (const name of actions) {
      const body = source.slice(source.indexOf(`export async function ${name}(`)).split("\nexport async function ")[0]
      expect(body, name).toMatch(/await gate\("\w+", formData|return setSales\(formData/)
    }
  })

  it("puts search in the shell and limits Team & access to the owner", () => {
    const shell = read("components/super-admin/SuperAdminShell.tsx")
    expect(shell).toContain('action="/super-admin/search"')
    expect(shell).toContain('ownerOnly: true')
    expect(read("app/super-admin/team/page.tsx")).toContain('requireAdminRole(["super_admin"])')
  })
})

describe("phase 2: queues", () => {
  it("keys queue items and rejects anything else", () => {
    expect(queueItemKey("refunds", ORDER)).toBe(`refunds:${ORDER}`)
    expect(parseQueueItemKey(`refunds:${ORDER}`)).toEqual({ queue: "refunds", recordId: ORDER })
    expect(parseQueueItemKey("payments:PAY-1A2B3C4D")).toEqual({ queue: "payments", recordId: "PAY-1A2B3C4D" })
    expect(parseQueueItemKey("users:1")).toBeNull()
    expect(parseQueueItemKey("refunds:")).toBeNull()
    expect(parseQueueItemKey(42)).toBeNull()
  })

  it("calls a scanner offline after 15 quiet minutes", () => {
    const now = new Date("2026-11-07T18:00:00Z")
    expect(scannerIsOffline("2026-11-07T17:50:00Z", now)).toBe(false)
    expect(scannerIsOffline("2026-11-07T17:40:00Z", now)).toBe(true)
    expect(scannerIsOffline(null, now)).toBe(true)
  })

  it("only lists orders whose tickets never went out", () => {
    const rows = [
      { order_id: "a", status: "failed", created_at: "2026-11-07T10:00:00Z" },
      { order_id: "a", status: "sent", created_at: "2026-11-07T10:05:00Z" },
      { order_id: "b", status: "failed", created_at: "2026-11-07T09:00:00Z" },
      { order_id: "b", status: "failed", created_at: "2026-11-07T11:00:00Z" },
      { order_id: "c", status: "skipped", created_at: "2026-11-07T11:00:00Z" },
      { order_id: null, status: "failed", created_at: "2026-11-07T11:00:00Z" },
    ]
    expect(undeliveredOrders(rows)).toEqual([{ orderId: "b", lastFailureAt: "2026-11-07T11:00:00Z" }])
  })

  it("shows tickets in the words the attendee sees", () => {
    expect(attendeeTicketState({ status: "issued" })).toBe("valid")
    expect(attendeeTicketState({ status: "issued", checked_in_at: "x" })).toBe("used")
    expect(attendeeTicketState({ status: "issued", refunded_at: "x" })).toBe("refunded")
    expect(attendeeTicketState({ status: "revoked" })).toBe("cancelled")
    expect(attendeeTicketState({ status: "pending" })).toBe("pending")
  })
})

describe("phase 2: money and access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.inserts.length = 0
    mocks.updates.length = 0
    mocks.rows = {}
  })

  it("lets only the owner approve a refund, and only once", async () => {
    const REFUND = "44444444-4444-4444-8444-444444444444"
    mocks.context.role = "support_admin"
    expect((await approveRefundAction(IDLE_RESULT, form({ refundId: REFUND, reason: "Event moved, buyer can't come" }))).status).toBe("error")
    mocks.context.role = "finance_admin"
    expect((await approveRefundAction(IDLE_RESULT, form({ refundId: REFUND, reason: "Event moved, buyer can't come" }))).status).toBe("error")
    expect(mocks.initiateRefund).not.toHaveBeenCalled()

    mocks.context.role = "super_admin"
    mocks.rows.refunds = { id: REFUND, status: "processing", amount_cents: 35000, currency: "SZL", payments: { order_id: ORDER, orders: { org_id: null } } }
    expect(await approveRefundAction(IDLE_RESULT, form({ refundId: REFUND, reason: "Event moved, buyer can't come" }))).toEqual({
      status: "error",
      message: "This refund is already processing.",
    })

    mocks.rows.refunds = { ...mocks.rows.refunds, status: "requested" }
    mocks.initiateRefund.mockResolvedValue({ ok: true, refundId: REFUND, provider: "paystack", mode: "automatic", status: "processing" })
    const ok = await approveRefundAction(IDLE_RESULT, form({ refundId: REFUND, reason: "Event moved, buyer can't come" }))
    expect(ok).toMatchObject({ status: "done", message: expect.stringContaining("sent to paystack") })
    expect(mocks.initiateRefund).toHaveBeenCalledWith(REFUND)
    expect(mocks.inserts.find((i) => i.table === "audit_log")!.row.changes).toMatchObject({ action: "approve_refund", order_id: ORDER })
  })

  it("keeps pausing sales to event ops and the owner, with a reason", async () => {
    mocks.context.role = "support_admin"
    expect((await pauseSalesAction(IDLE_RESULT, form({ ticketTypeId: ITEM, reason: "Venue capacity was reduced" }))).status).toBe("error")
    mocks.context.role = "event_ops_admin"
    expect((await pauseSalesAction(IDLE_RESULT, form({ ticketTypeId: ITEM, reason: "short" }))).status).toBe("error")
    mocks.rows.ticket_types = { id: ITEM, name: "General", event_id: ORDER, sales_status: "on_sale", events: { org_id: null } }
    expect((await pauseSalesAction(IDLE_RESULT, form({ ticketTypeId: ITEM, reason: "Venue capacity was reduced" }))).status).toBe("done")
    expect(mocks.updates[0]).toMatchObject({ table: "ticket_types", row: { sales_status: "paused", sales_pause_reason: "Venue capacity was reduced" } })
  })

  it("starts View as only with a reason, and logs it before showing anything", async () => {
    mocks.context.role = "support_admin"
    expect((await startViewAsAction(IDLE_RESULT, form({ userId: ORDER, reason: "" }))).status).toBe("error")
    mocks.rows.audit_log = { id: "55555555-5555-4555-8555-555555555555" }
    await expect(startViewAsAction(IDLE_RESULT, form({ userId: ORDER, reason: "Buyer can't find their ticket" }))).rejects.toThrow("NEXT_REDIRECT")
    const logged = mocks.inserts.find((i) => i.table === "audit_log")!.row
    expect(logged).toMatchObject({ record_id: ORDER, changes: { action: "view_as", reason: "Buyer can't find their ticket" } })
    mocks.context.role = "finance_admin"
    expect((await startViewAsAction(IDLE_RESULT, form({ userId: ORDER, reason: "Buyer can't find their ticket" }))).status).toBe("error")
  })

  it("keeps queue claims away from browsers", () => {
    const sql = read("supabase/migrations/20261107100000_admin_console_phase2.sql")
    expect(sql).toContain("alter table public.admin_queue_claims enable row level security;")
    expect(sql).toContain("revoke all on public.admin_queue_claims from anon, authenticated;")
  })
})

describe("phase 3: Chatwoot", () => {
  it("needs all three settings, https and a numeric account", () => {
    expect(chatwootConfig({})).toEqual({ ok: false, missing: ["CHATWOOT_BASE_URL", "CHATWOOT_ACCOUNT_ID", "CHATWOOT_API_TOKEN"] })
    expect(chatwootConfig({ CHATWOOT_BASE_URL: "http://chat.example.com", CHATWOOT_ACCOUNT_ID: "1", CHATWOOT_API_TOKEN: "t" })).toMatchObject({ ok: false, problem: expect.stringMatching(/https/) })
    expect(chatwootConfig({ CHATWOOT_BASE_URL: "https://chat.example.com", CHATWOOT_ACCOUNT_ID: "abc", CHATWOOT_API_TOKEN: "t" })).toMatchObject({ ok: false })
    const ok = chatwootConfig({ CHATWOOT_BASE_URL: "https://chat.example.com/app/", CHATWOOT_ACCOUNT_ID: "3", CHATWOOT_API_TOKEN: "t" })
    expect(ok).toEqual({ ok: true, config: { baseUrl: "https://chat.example.com", accountId: "3", token: "t" } })
    if (!ok.ok) throw new Error("config")
    expect(chatwootApiUrl(ok.config, "/conversations", { status: "open" })).toBe("https://chat.example.com/api/v1/accounts/3/conversations?status=open")
    expect(chatwootConversationLink(ok.config, 118)).toBe("https://chat.example.com/app/accounts/3/conversations/118")
  })

  it("reads conversations and messages as support sees them", () => {
    const [c] = parseConversations({
      data: {
        payload: [
          {
            id: 118,
            status: "open",
            unread_count: 2,
            last_activity_at: 1762520400,
            meta: { sender: { name: "Sample Buyer", email: "Buyer@Example.com", phone_number: "+26876000000" }, channel: "Channel::Whatsapp", assignee: { name: "Support" } },
            messages: [{ content: "My tickets never came" }],
          },
        ],
      },
    })
    expect(c).toMatchObject({ id: 118, contactName: "Sample Buyer", email: "buyer@example.com", channel: "WhatsApp", assignee: "Support", unread: 2, lastMessage: "My tickets never came" })
    const messages = parseMessages({
      payload: [
        { id: 3, content: "Resent", message_type: 1, created_at: 30, sender: { name: "Support" } },
        { id: 1, content: "Help", message_type: 0, created_at: 10 },
        { id: 2, content: "typo in email", message_type: 1, private: true, created_at: 20 },
        { id: 4, content: "", message_type: 2, created_at: 40 },
      ],
    })
    expect(messages.map((m) => [m.id, m.from])).toEqual([[1, "customer"], [2, "note"], [3, "agent"]])
  })

  it("lets only support and the owner reply, and logs it", async () => {
    mocks.inserts.length = 0
    mocks.context.role = "finance_admin"
    expect((await replyToCaseAction(IDLE_RESULT, form({ conversationId: "118", content: "Hi" }))).status).toBe("error")
    expect(mocks.sendCaseMessage).not.toHaveBeenCalled()
    mocks.context.role = "support_admin"
    mocks.sendCaseMessage.mockResolvedValue({ ok: true, data: true })
    expect(await replyToCaseAction(IDLE_RESULT, form({ conversationId: "118", content: "Your tickets were resent.", private: "1" }))).toMatchObject({ status: "done" })
    expect(mocks.sendCaseMessage).toHaveBeenCalledWith(118, "Your tickets were resent.", true)
    expect(mocks.inserts.find((i) => i.table === "audit_log")!.row.changes).toMatchObject({ action: "work_cases", conversation_id: 118 })
    mocks.sendCaseMessage.mockResolvedValue({ ok: false, error: "Chatwoot refused the access token. Check CHATWOOT_API_TOKEN." })
    expect(await replyToCaseAction(IDLE_RESULT, form({ conversationId: "118", content: "Hi" }))).toEqual({ status: "error", message: expect.stringMatching(/access token/) })
  })
})

describe("phase 3: settings history", () => {
  it("shows what changed in plain before/after, without save noise", () => {
    expect(
      describeChange("update", { key: "resale", enabled: false, updated_at: "a" }, { key: "resale", enabled: true, updated_at: "b" }),
    ).toEqual([{ field: "enabled", before: "false", after: "true" }])
    expect(describeChange("delete", { key: "resale", enabled: true }, null)).toEqual([
      { field: "enabled", before: "true", after: "" },
      { field: "key", before: "resale", after: "" },
    ])
    expect(settingLabel({ key: "resale" })).toBe("resale")
    expect(settingLabel({ provider: "paystack" })).toBe("paystack")
    expect(settingLabel({ currency: "SZL", country_code: "SZ" })).toBe("SZL · SZ")
  })

  it("lets only the owner restore, with a reason, and explains refusals", async () => {
    mocks.inserts.length = 0
    mocks.context.role = "support_admin"
    expect((await restoreSettingAction(IDLE_RESULT, form({ historyId: "7", reason: "Flag was switched on by mistake" }))).status).toBe("error")
    mocks.context.role = "super_admin"
    expect((await restoreSettingAction(IDLE_RESULT, form({ historyId: "7", reason: "short" }))).status).toBe("error")
    mocks.rows.admin_settings_history = { table_name: "feature_flags", record_id: ORDER }
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "cannot_undo_insert" } })
    expect(await restoreSettingAction(IDLE_RESULT, form({ historyId: "7", reason: "Flag was switched on by mistake" }))).toEqual({
      status: "error",
      message: expect.stringMatching(/switch the setting off/),
    })
    mocks.rpc.mockResolvedValueOnce({ data: "restored", error: null })
    expect((await restoreSettingAction(IDLE_RESULT, form({ historyId: "7", reason: "Flag was switched on by mistake" }))).status).toBe("done")
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_restore_setting", { p_history_id: 7 })
    expect(mocks.inserts.find((i) => i.table === "audit_log")!.row).toMatchObject({ table_name: "feature_flags", record_id: ORDER, changes: { action: "restore_setting" } })
  })

  it("never stores secrets and keeps both tables away from browsers", () => {
    const sql = read("supabase/migrations/20261108100000_admin_console_phase3.sql")
    for (const table of ["admin_settings_history", "admin_saved_replies"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`)
      expect(sql).toContain(`revoke all on public.${table} from anon, authenticated;`)
    }
    expect(sql).toMatch(/secret\|token\|password/)
    expect(sql).toContain("revoke all on function public.admin_restore_setting(bigint) from public, anon, authenticated;")
    expect(sql).toContain("grant execute on function public.admin_restore_setting(bigint) to service_role;")
    for (const table of ["feature_flags", "payment_routing_rules", "platform_fee_settings", "pricing_plans", "tapband_feature_configs", "payment_provider_settings"]) {
      expect(sql).toContain(`('${table}',`)
    }
  })
})
