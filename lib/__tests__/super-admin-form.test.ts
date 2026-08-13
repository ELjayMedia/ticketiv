import { describe, expect, it } from "vitest"

import { buildAdminCreateDefaults, firstSearchParam } from "@/lib/super-admin/form"
import { allowedGenericMutationRolesForResource, canMutateResource } from "@/lib/super-admin/permissions"
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

  it("keeps sensitive TapBand lifecycle resources read-only in the generic console", () => {
    for (const key of ["physical-credentials", "credential-entitlements", "credential-taps", "tapband-telemetry-events"]) {
      expect(allowedGenericMutationRolesForResource(key)).toEqual([])
      expect(canMutateResource(key, "super_admin")).toBe(false)
      expect(canMutateResource(key, "support_admin")).toBe(false)
    }
  })

  it("keeps payout banking details out of generic admin reads and mutations", () => {
    const resource = getAdminResource("payout-accounts")

    expect(resource?.selectColumns).toEqual(["id", "org_id", "provider", "created_at"])
    expect(resource?.fields.map((field) => field.name)).not.toContain("details_encrypted")
    expect(allowedGenericMutationRolesForResource("payout-accounts")).toEqual([])
    expect(canMutateResource("payout-accounts", "super_admin")).toBe(false)
  })

  it("keeps TapBand batch and inventory resources searchable for reconciliation", () => {
    const batches = getAdminResource("credential-batches")
    const inventory = getAdminResource("credential-inventory")

    expect(batches?.searchColumns).toContain("supplier_reference")
    expect(batches?.searchColumns).toContain("status")
    expect(inventory?.searchColumns).toContain("public_serial")
    expect(inventory?.searchColumns).toContain("inventory_status")
    expect(allowedGenericMutationRolesForResource("credential-batches")).toEqual(["super_admin"])
    expect(allowedGenericMutationRolesForResource("credential-inventory")).toEqual(["super_admin"])
  })
})
