import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { OrgPayoutsOverview } from "@/lib/data/organizer/payouts"
import { mapPayouts } from "@/lib/mappers/payouts"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261102120000_payout_account_management.sql"),
  "utf8",
)
const root = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

function overview(accounts: OrgPayoutsOverview["accounts"]): OrgPayoutsOverview {
  const zero = {
    grossCents: 0, feesCents: 0, netCents: 0, refundsCents: 0, paidOutCents: 0, pendingPayoutCents: 0,
    availableCents: 0, capturedAvailableCents: 0, settledNetCents: 0, pendingSettlementCents: 0, settlementHoldDays: 4,
  }
  return {
    orgId: "o1", orgName: "Org", currency: "SZL", availableBalanceCents: 0, onHoldCents: 0, lifetimeGrossCents: 0,
    finance: zero, payouts: [], ledger: [], accounts,
    paymentReadiness: { currency: "SZL", activeRoutingRules: [], enabledProviders: [], recentFailedAttempts: [] },
  }
}

const account = (id: string, provider: string, last4: string, isPrimary: boolean) => ({
  id, provider, details_encrypted: `••••${last4}`, created_at: "2026-11-01T00:00:00Z", is_primary: isPrimary,
})

describe("payout accounts: one real primary account", () => {
  it("labels only the primary account Primary, wherever it sits in the list", () => {
    const props = mapPayouts(overview([account("a", "fnb", "1111", false), account("b", "standard_bank", "7482", true)]))
    expect(props.accounts.map((a) => a.label)).toEqual(["Account 1", "Primary"])
    expect(props.primaryAccountLabel).toContain("7482")
  })

  it("the database keeps one primary per org and pays out to it", () => {
    expect(migration).toMatch(/create unique index if not exists payout_accounts_one_primary_per_org\s+on public\.payout_accounts \(org_id\)\s+where is_primary/)
    expect(migration).toContain("order by is_primary desc, created_at")
    // Backfill keeps payouts going where they went before (the oldest account).
    expect(migration).toContain("order by org_id, created_at, id")
  })

  it("add, set-primary and delete are owner/admin RPCs, closed to anon", () => {
    for (const fn of ["fn_add_payout_account", "fn_set_primary_payout_account", "fn_delete_payout_account"]) {
      const body = migration.slice(migration.indexOf(`create or replace function public.${fn}`))
      expect(body.slice(0, 2500), fn).toContain("app.is_org_admin_of(")
      expect(body.slice(0, 2500), fn).toContain("app.require_claimed_account()")
      expect(migration, fn).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon`))
    }
    expect(migration).toContain("raise exception 'payout_in_progress'")
  })

  it("the app writes payout accounts only through those RPCs", () => {
    const actions = root("app/orgs/[orgId]/payouts/accounts/actions.ts")
    expect(actions).not.toMatch(/from\("payout_accounts"\)\s*\.(insert|update|delete)/)
    for (const fn of ["fn_add_payout_account", "fn_set_primary_payout_account", "fn_delete_payout_account"]) {
      expect(actions).toContain(`"${fn}"`)
    }
    const page = root("app/orgs/[orgId]/payouts/accounts/page.tsx")
    expect(page).toContain("account.isPrimary && <Chip")
  })
})
