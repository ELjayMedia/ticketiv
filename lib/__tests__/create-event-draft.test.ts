import { describe, expect, it } from "vitest"

import {
  buildCreateEventDraftParams,
  NEW_EVENT_START_FIELDS,
  normalizeEventTitle,
} from "@/lib/events/create-event-draft"

describe("new event draft handoff", () => {
  it("keeps the start screen limited to the event title", () => {
    expect(NEW_EVENT_START_FIELDS).toEqual(["title"])

    const params = buildCreateEventDraftParams("org-1", "  Worship in my Room  ")

    expect(params).toEqual({
      p_org_id: "org-1",
      p_title: "Worship in my Room",
      p_visibility: "private",
    })
    expect(params).not.toHaveProperty("description")
  })

  it("normalizes titles and rejects an empty event name", () => {
    expect(normalizeEventTitle("  Event name  ")).toBe("Event name")
    expect(() => buildCreateEventDraftParams("org-1", "   ")).toThrow("Event name is required")
  })
})
