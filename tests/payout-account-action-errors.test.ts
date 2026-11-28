import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Sentry TICKETIV-7/8: Next.js hides thrown server-action messages in production,
// so expected payout-account failures must be returned and shown, never thrown.
const root = (p: string) => readFileSync(join(__dirname, "..", p), "utf8")

describe("payout account actions return expected errors", () => {
  const actions = root("app/orgs/[orgId]/payouts/accounts/actions.ts")

  it("never throws RPC or validation errors to the client", () => {
    expect(actions).not.toMatch(/throw rpcError/)
    expect(actions).not.toMatch(/throw new Error\(check\.message\)/)
    expect(actions).toMatch(/return rpcError\(error\)/)
    expect(actions).toContain('payout_in_progress: "A payout is being paid to this account.')
    for (const fn of ["addPayoutAccountAction", "setPrimaryPayoutAccountAction", "deletePayoutAccountAction"]) {
      expect(actions).toMatch(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\): Promise<PayoutAccountActionResult>`))
    }
  })

  it("callers display the returned error", () => {
    for (const p of [
      "app/orgs/[orgId]/payouts/accounts/payout-account-form.tsx",
      "components/quiet/screens/payouts/payout-account-actions.tsx",
    ]) {
      const src = root(p)
      expect(src, p).toMatch(/if \(!result\.ok\) \{\s*setError\(result\.error\)/)
    }
  })
})
