import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { migrationFunction, migrationFunctionGrants } from "./helpers/migration-contract"

const writer = migrationFunction("public.admin_set_platform_fee")
const trigger = migrationFunction("app.recompute_order_totals")
const action = readFileSync(join(process.cwd(), "app/super-admin/pricing/actions.ts"), "utf8")
const form = readFileSync(join(process.cwd(), "app/super-admin/pricing/PlatformFeeForm.tsx"), "utf8")
const page = readFileSync(join(process.cwd(), "app/super-admin/pricing/page.tsx"), "utf8")

describe("platform fee (super admin)", () => {
  it("keeps the atomic writer service-role only", () => {
    expect(writer).toContain("security definer")
    expect(writer).toContain("pg_advisory_xact_lock")

    const grants = migrationFunctionGrants("public.admin_set_platform_fee")
    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(grants.grantees).toEqual(["service_role"])
  })

  it("versions the rate and audits every change without touching orders", () => {
    expect(writer).toContain("set active = false")
    expect(writer).toContain("insert into public.platform_fee_settings")
    expect(writer).toContain("'set_platform_fee'")
    expect(writer).toContain("insert into public.audit_log")
    expect(writer).not.toMatch(/update public\.orders/i)
  })

  it("prices new orders per ticket from the platform setting, paid by the organizer", () => {
    expect(trigger).toContain("from public.platform_fee_settings")
    expect(trigger).toContain("'platform_fixed_per_ticket_cents'")
    expect(trigger).toContain("'fees_paid_by', 'organizer'")
    // Free tickets pay nothing; a ticket's fee is capped at its price.
    expect(trigger).toContain("filter (where tt.price_cents > 0)")
    expect(trigger).toMatch(/least\(\s*tt\.price_cents/)
  })

  it("never reprices settled orders", () => {
    expect(trigger).toContain("old.status is distinct from 'pending'::public.order_status")
  })

  it("requires a real super-admin server action", () => {
    expect(action).toContain('requireAdminRole(["super_admin"])')
    expect(action).toContain("admin_set_platform_fee")
    expect(page).toContain('requireAdminRole(["super_admin"])')
    expect(page).toContain("Fee history")
    expect(form).toContain("Applies to orders placed from now on")
  })

  it("does not wire payout fees into order pricing", () => {
    expect(page).toContain("Withdrawal fees and minimum payout thresholds stay outside order math")
    expect(writer).not.toMatch(/withdrawal_fee/i)
    expect(writer).not.toMatch(/minimum_payout/i)
  })
})
