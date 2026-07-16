import { describe, expect, it } from "vitest"

import { buildAdminCreateDefaults, firstSearchParam } from "@/lib/super-admin/form"
import { getAdminResource } from "@/lib/super-admin/resources"

describe("super admin form defaults", () => {
  it("uses the first query value and ignores missing values", () => {
    expect(firstSearchParam(["first", "second"])).toBe("first")
    expect(firstSearchParam("only")).toBe("only")
    expect(firstSearchParam(undefined)).toBeUndefined()
  })

  it("only builds create defaults for editable fields on the resource", () => {
    const resource = getAdminResource("event-staff")
    expect(resource).toBeTruthy()

    expect(
      buildAdminCreateDefaults(resource!, {
        event_id: "event-1",
        role: "scanner",
        active: "true",
        status: "created",
        unknown: "ignored",
        user_id: "",
      }),
    ).toEqual({
      event_id: "event-1",
      role: "scanner",
      active: "true",
    })
  })

  it("does not prefill readonly resource fields", () => {
    const resource = getAdminResource("pricing-plans")
    expect(resource).toBeTruthy()

    expect(
      buildAdminCreateDefaults(resource!, {
        id: "should-not-prefill",
        org_id: "org-1",
        currency: "SZL",
        active: "true",
      }),
    ).toEqual({
      org_id: "org-1",
      currency: "SZL",
      active: "true",
    })
  })
})
