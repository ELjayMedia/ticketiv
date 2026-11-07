import { describe, expect, it } from "vitest"

import { buildReminderEmail, emailDedupeKey } from "@/lib/notifications/reminder-email-template"

const base = {
  id: "n1",
  user_id: "u1",
  type: "event_reminder",
  dedupe_key: "event_reminder:24h:e1:u1",
  created_at: "2026-11-15T10:07:00Z",
}

describe("reminder emails", () => {
  it("uses the reminder's own words and links to the event guide", () => {
    const email = buildReminderEmail(
      { ...base, payload: { title: "Tomorrow: Sunset Sessions", body: "Starts Sun 16 Nov at 18:00.", href: "/tickets/event/e1", eventTitle: "Sunset Sessions" } },
      "https://ticketiv.com/",
    )
    expect(email.subject).toBe("Tomorrow: Sunset Sessions")
    expect(email.html).toContain('href="https://ticketiv.com/tickets/event/e1"')
    expect(email.text).toContain("Open your ticket and event guide: https://ticketiv.com/tickets/event/e1")
  })

  it("escapes event names and never links off-site", () => {
    const email = buildReminderEmail(
      { ...base, type: "saved_event_reminder", payload: { eventTitle: "<b>Fest</b>", href: "//evil.example/x" } },
      "https://ticketiv.com",
    )
    expect(email.subject).toBe("Coming up: <b>Fest</b>")
    expect(email.html).toContain("Coming up: &lt;b&gt;Fest&lt;/b&gt;")
    expect(email.html).toContain('href="https://ticketiv.com/tickets"')
    expect(email.html).not.toContain("evil.example")
  })

  it("logs each email under its own key so it is never sent twice", () => {
    expect(emailDedupeKey(base.dedupe_key)).toBe("email:event_reminder:24h:e1:u1")
  })
})

describe("companion pushes", () => {
  it("uses the notification's words, stays on our site and groups by event", async () => {
    const { buildCompanionPush, pushDedupeKey } = await import("@/lib/notifications/reminder-email-template")
    const push = buildCompanionPush({ ...base, type: "event_update", payload: { title: "Gates open earlier", body: "Doors 17:30.", href: "/tickets/event/e1", eventId: "e1" } })
    expect(push).toEqual({ title: "Gates open earlier", body: "Doors 17:30.", url: "/tickets/event/e1", tag: "event_update:e1" })
    expect(buildCompanionPush({ ...base, payload: { href: "https://evil.example" } }).url).toBe("/notifications")
    expect(pushDedupeKey("k")).toBe("push:k")
  })
})
