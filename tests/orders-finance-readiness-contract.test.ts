import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("organizer order and refund readiness", () => {
  it("loads refunds through the order payment relationship", () => {
    const detail = read("app/orgs/[orgId]/events/[eventId]/orders/[orderId]/page.tsx")
    expect(detail).toContain('.from("payments")')
    expect(detail).toContain('.in("payment_id", paymentIds)')
    expect(detail).not.toContain('.in(\n      "id",\n      items')
  })

  it("supports explicit partial amounts without exceeding payment or ticket value", () => {
    const actions = read("app/orgs/[orgId]/events/[eventId]/orders/actions.ts")
    expect(actions).toContain("amountCents")
    expect(actions).toContain("remainingRefundable")
    expect(actions).toContain("itemFaceValue")
    expect(actions).toContain('status: "requested"')
  })

  it("records semantic support events using the shared audit_action taxonomy", () => {
    const actions = read("app/orgs/[orgId]/events/[eventId]/orders/actions.ts")
    const detail = read("app/orgs/[orgId]/events/[eventId]/orders/[orderId]/page.tsx")
    expect(actions).toContain('.from("audit_log")')
    expect(actions).toContain('action: "other"')
    expect(actions).toContain('event_type: "refund_requested"')
    expect(actions).toContain('event_type: "ticket_revoked"')
    expect(detail).toContain('.eq("action", "other")')
    expect(detail).toContain("changes?.event_type")
  })

  it("exposes payment, ownership, refund and support history on order detail", () => {
    const detail = read("app/orgs/[orgId]/events/[eventId]/orders/[orderId]/page.tsx")
    expect(detail).toContain("Payments (")
    expect(detail).toContain("Ownership and transfers")
    expect(detail).toContain("Refund history")
    expect(detail).toContain("Support audit trail")
  })
})
