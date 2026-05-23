import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { getDemoOrganization } from "@/lib/demo-data"

export const dynamic = "force-dynamic"

interface PricingPlan {
  id: string
  name: string
  monthly_fee_cents: number
  transaction_fee_percent: number
  features: string[]
}

export default async function PricingPlansPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let org: any = null
  let pricingPlans: PricingPlan[] = []

  if (demoSessionCookie) {
    try {
      org = getDemoOrganization(orgId)
      if (!org) return redirect("/403")
      pricingPlans = [
        { id: "starter", name: "Starter", monthly_fee_cents: 0, transaction_fee_percent: 5, features: ["Up to 5 events/month", "Basic analytics", "Community support"] },
        { id: "pro", name: "Pro", monthly_fee_cents: 9999, transaction_fee_percent: 2.5, features: ["Unlimited events", "Advanced analytics", "Priority support", "Custom branding"] },
        { id: "enterprise", name: "Enterprise", monthly_fee_cents: 29999, transaction_fee_percent: 1.5, features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee"] },
      ]
    } catch {
      /* fall through */
    }
  } else {
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
    org = orgData

    const { data: plans = [] } = await supabase
      .from("pricing_plans")
      .select("id, name, monthly_fee_cents, transaction_fee_percent, features")
      .eq("org_id", orgId)
    pricingPlans = (plans ?? []) as PricingPlan[]
  }

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
                    <p className="text-h3">{plan.name}</p>
                    <p className="text-[12px] text-ink-3">Current plan for this organisation.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[32px] font-semibold tabular-nums text-ink">
                        ${(plan.monthly_fee_cents / 100).toFixed(0)}
                      </span>
                      <span className="text-[13px] text-ink-3">/month</span>
                    </div>
                    <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      <Icon name="wallet" size={12} />
                      {plan.transaction_fee_percent}% per transaction
                    </p>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {plan.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[13px] text-ink">
                        <Icon name="check" size={14} className="mt-0.5 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

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
