import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { PayoutAccountForm } from "./payout-account-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payout accounts" }

// TICK-54 — Payout account setup (organizer side)

export default async function PayoutAccountsPage({
  params,
}: {
  params: { orgId: string }
}) {
  const { orgId } = params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const adminRoles = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  if (!member) return redirect("/403")
  const canManage = adminRoles.has(String(member.role))

  const { data: accounts = [] } = await supabase
    .from("payout_accounts")
    .select("id, provider, details_encrypted, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })

  // Mask account numbers — never render more than last 4 chars of numeric details
  const maskedAccounts = (accounts ?? []).map((a) => {
    let display = "••••"
    try {
      const parsed = JSON.parse(a.details_encrypted ?? "{}")
      const raw = parsed.account_number ?? parsed.iban ?? parsed.ref ?? ""
      display = raw.length > 4 ? `••••${String(raw).slice(-4)}` : "••••"
    } catch {
      display = "••••"
    }
    return {
      id: a.id,
      provider: a.provider,
      maskedRef: display,
      addedAt: a.created_at,
    }
  })

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/payouts`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg hover:text-ink"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-h1">Payout accounts</h1>
            <p className="text-[13px] text-ink-3">
              Banking details stored encrypted at rest. Account numbers are never displayed in full.
            </p>
          </div>
        </div>

        {maskedAccounts.length > 0 && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">Accounts ({maskedAccounts.length})</p>
            </CardBody>
            <CardDivider />
            <div className="divide-y divide-line">
              {maskedAccounts.map((account) => (
                <CardBody key={account.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold capitalize text-ink">
                        {account.provider}
                      </p>
                      <Chip size="sm" variant="active">Primary</Chip>
                    </div>
                    <p className="font-mono text-[12px] text-ink-3">
                      {account.maskedRef} · Added{" "}
                      {new Date(account.addedAt).toLocaleDateString("en-SZ")}
                    </p>
                  </div>
                  <Icon name="check" size={16} className="text-success" />
                </CardBody>
              ))}
            </div>
          </Card>
        )}

        {canManage && (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">
                {maskedAccounts.length === 0 ? "Add payout account" : "Add another account"}
              </p>
              {maskedAccounts.length === 0 && (
                <p className="mt-1 text-[13px] text-ink-3">
                  Connect your bank to receive ticket sale proceeds.
                </p>
              )}
            </CardBody>
            <CardDivider />
            <CardBody className="p-5">
              <PayoutAccountForm orgId={orgId} />
            </CardBody>
          </Card>
        )}

        {!canManage && maskedAccounts.length === 0 && (
          <Card flat className="border-dashed">
            <CardBody className="py-8 text-center text-[13px] text-ink-3">
              Only org admins can add payout accounts.
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  )
}
