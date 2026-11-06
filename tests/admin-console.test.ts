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
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
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
  changeBuyerEmailAction,
  reissueTicketAction,
  resendTicketsAction,
} from "@/app/super-admin/console-actions"
import { supportReferenceRow, createPaymentChannelUnavailableError } from "@/lib/payments/errors"
import { canDo, classifySearch, IDLE_RESULT, normalizeEmail, reasonProblem } from "@/lib/super-admin/console"

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
      expect(body, name).toMatch(/await gate\("\w+", formData/)
    }
  })

  it("puts search in the shell and limits Team & access to the owner", () => {
    const shell = read("components/super-admin/SuperAdminShell.tsx")
    expect(shell).toContain('action="/super-admin/search"')
    expect(shell).toContain('ownerOnly: true')
    expect(read("app/super-admin/team/page.tsx")).toContain('requireAdminRole(["super_admin"])')
  })
})
