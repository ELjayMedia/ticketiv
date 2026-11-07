import { describe, expect, it } from "vitest"

import { ADMIN_RESOURCES } from "@/lib/super-admin/resources"
import { auditRecordHref, DETAIL_REDIRECTS, NO_HAND_CREATE, profileHrefFor, profileLabelFor } from "@/lib/super-admin/profile-links"

const ORDER = "11111111-1111-4111-8111-111111111111"
const EVENT = "22222222-2222-4222-8222-222222222222"
const ORG = "33333333-3333-4333-8333-333333333333"
const USER = "44444444-4444-4444-8444-444444444444"

describe("profileHrefFor", () => {
  it("sends order rows and their children to the order page", () => {
    expect(profileHrefFor("orders", { id: ORDER })).toBe(`/super-admin/order/${ORDER}`)
    expect(profileHrefFor("order-items", { id: "x", order_id: ORDER })).toBe(`/super-admin/order/${ORDER}`)
    expect(profileHrefFor("payments", { order_id: ORDER })).toBe(`/super-admin/order/${ORDER}`)
  })

  it("sends event, organizer and people rows to their profiles", () => {
    expect(profileHrefFor("ticket-types", { event_id: EVENT })).toBe(`/super-admin/event/${EVENT}`)
    expect(profileHrefFor("payouts", { org_id: ORG })).toBe(`/super-admin/organizer/${ORG}`)
    expect(profileHrefFor("event-staff", { user_id: USER, event_id: EVENT })).toBe(`/super-admin/people/${USER}`)
  })

  it("returns null when the row lacks the link or the table has no profile", () => {
    expect(profileHrefFor("payments", { order_id: null })).toBeNull()
    expect(profileHrefFor("orders", { id: "" })).toBeNull()
    expect(profileHrefFor("venues", { id: "v1" })).toBeNull()
  })

  it("labels the button by profile kind", () => {
    expect(profileLabelFor("payments")).toBe("Open order")
    expect(profileLabelFor("devices")).toBe("Open event")
    expect(profileLabelFor("payouts")).toBe("Open organizer")
    expect(profileLabelFor("org-members")).toBe("Open person")
    expect(profileLabelFor("venues")).toBeNull()
  })
})

describe("resource keys", () => {
  it("only names resources that exist", () => {
    const known = new Set(ADMIN_RESOURCES.map((r) => r.key))
    for (const key of [...NO_HAND_CREATE, ...Object.keys(DETAIL_REDIRECTS)]) {
      expect(known.has(key), key).toBe(true)
    }
  })

  it("never offers hand-made orders or payments", () => {
    expect(NO_HAND_CREATE.has("orders")).toBe(true)
    expect(NO_HAND_CREATE.has("payments")).toBe(true)
    expect(NO_HAND_CREATE.has("events")).toBe(false)
  })
})

describe("auditRecordHref", () => {
  it("links records to their profile", () => {
    expect(auditRecordHref("orders", ORDER)).toBe(`/super-admin/order/${ORDER}`)
    expect(auditRecordHref("events", EVENT)).toBe(`/super-admin/event/${EVENT}`)
    expect(auditRecordHref("organizations", ORG)).toBe(`/super-admin/organizer/${ORG}`)
    expect(auditRecordHref("auth.users", USER)).toBe(`/super-admin/people/${USER}`)
  })

  it("uses the order or event named in the changes for child records", () => {
    expect(auditRecordHref("refunds", "r1", { order_id: ORDER })).toBe(`/super-admin/order/${ORDER}`)
    expect(auditRecordHref("ticket_types", "t1", { event_id: EVENT })).toBe(`/super-admin/event/${EVENT}`)
    expect(auditRecordHref("anything_else", "x", { order_id: ORDER })).toBe(`/super-admin/order/${ORDER}`)
  })

  it("returns null rather than a broken link", () => {
    expect(auditRecordHref("orders", null)).toBeNull()
    expect(auditRecordHref("refunds", "r1", {})).toBeNull()
    expect(auditRecordHref(null, null, null)).toBeNull()
  })
})
