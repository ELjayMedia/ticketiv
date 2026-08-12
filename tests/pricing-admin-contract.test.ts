import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260812183000_pricing_plan_admin_version_rpc.sql"),
  "utf8",
)
const action = readFileSync(join(process.cwd(), "app/super-admin/pricing/actions.ts"), "utf8")
const form = readFileSync(join(process.cwd(), "app/super-admin/pricing/PricingPlanForm.tsx"), "utf8")
const page = readFileSync(join(process.cwd(), "app/super-admin/pricing/page.tsx"), "utf8")

describe("super-admin pricing versioning", () => {
  it("keeps the atomic writer service-role only", () => {
    expect(migration).toContain("security definer")
    expect(migration).toContain("pg_advisory_xact_lock")
    expect(migration).toContain("revoke execute on function public.admin_create_pricing_plan_version")
    expect(migration).toContain("from anon, authenticated")
    expect(migration).toContain("grant execute on function public.admin_create_pricing_plan_version")
    expect(migration).toContain("to service_role")
  })

  it("versions instead of restating historical pricing", () => {
    expect(migration).toContain("set active = false")
    expect(migration).toContain("insert into public.pricing_plans")
    expect(migration).toContain("'create_pricing_plan_version'")
    expect(migration).toContain("insert into public.audit_log")
    expect(migration).not.toMatch(/update public\.orders/i)
  })

  it("pins the canonical organizer-paid order model", () => {
    expect(migration).toContain("p_platform_percent_bps")
    expect(migration).toContain("platform_fixed_cents")
    expect(migration).toContain("'organizer'::public.fee_payer")
    expect(migration).toContain("p_min_platform_fee_cents")
  })

  it("requires a real super-admin server action and surfaces the break-even guard", () => {
    expect(action).toContain('requireAdminRole(["super_admin"])')
    expect(action).toContain('admin_create_pricing_plan_version')
    expect(form).toContain("Break-even guard")
    expect(form).toContain("commission is at or below the processor percentage")
    expect(page).toContain("Pricing change history")
    expect(page).toContain('requireAdminRole(["super_admin"])')
  })

  it("does not wire payout fees into order pricing", () => {
    expect(page).toContain("Withdrawal fees and minimum payout thresholds stay outside order math")
    expect(migration).not.toMatch(/withdrawal_fee/i)
    expect(migration).not.toMatch(/minimum_payout/i)
  })
})
