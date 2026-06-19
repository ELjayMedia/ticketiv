import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"

interface PricingPlan {
  id: string
  active: boolean
  currency: string
  effective_from: string
  platform_percent_bps: number
  platform_fixed_cents: number
  platform_fee_payer: string
  processor_percent_bps: number
  processor_fixed_cents: number
}

export default async function PricingPlansPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: orgData } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle()
  if (!orgData) return redirect("/403")
  const org = orgData

  const { data: plans = [] } = await supabase
    .from("pricing_plans")
    .select("id, active, currency, effective_from, platform_percent_bps, platform_fixed_cents, platform_fee_payer, processor_percent_bps, processor_fixed_cents")
    .eq("org_id", orgId)
  const pricingPlans = (plans ?? []) as PricingPlan[]

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/dashboard`}
            aria-label="Back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Pricing plans</h1>
            <p className="text-[13px] text-ink-3">{org?.name}</p>
          </div>
        </div>

        {pricingPlans.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-[13px] text-ink-3">No pricing plans configured.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card key={plan.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col gap-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-h3">{plan.currency} plan</p>
                    <p className="text-[12px] text-ink-3">
                      Effective {new Date(plan.effective_from).toLocaleDateString()}
                      {plan.active ? "" : " · Inactive"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      <Icon name="wallet" size={12} />
                      Platform: {(plan.platform_percent_bps / 100).toFixed(2)}%
                      {plan.platform_fixed_cents > 0
                        ? ` + ${(plan.platform_fixed_cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })} ${plan.currency}`
                        : ""}
                    </p>
                    <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      <Icon name="wallet" size={12} />
                      Processor: {(plan.processor_percent_bps / 100).toFixed(2)}%
                      {plan.processor_fixed_cents > 0
                        ? ` + ${(plan.processor_fixed_cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })} ${plan.currency}`
                        : ""}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      Fees paid by: {plan.platform_fee_payer}
                    </p>
                  </div>

                  <Button variant="primary" size="md" block className="mt-auto">
                    View details
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardBody className="flex flex-col gap-2 p-5">
            <p className="text-h3">About pricing</p>
            <p className="text-[13px] text-ink-3">
              Pricing plans are managed by your account administrator. Contact support if you need to change your plan.
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
