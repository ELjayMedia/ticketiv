import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganization } from "@/lib/demo-data"
import { ArrowLeft, Check, DollarSign } from "lucide-react"

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
      if (!org) {
        return redirect("/403")
      }
      // Demo pricing plans
      pricingPlans = [
        {
          id: "starter",
          name: "Starter",
          monthly_fee_cents: 0,
          transaction_fee_percent: 5,
          features: ["Up to 5 events/month", "Basic analytics", "Community support"],
        },
        {
          id: "pro",
          name: "Pro",
          monthly_fee_cents: 9999,
          transaction_fee_percent: 2.5,
          features: ["Unlimited events", "Advanced analytics", "Priority support", "Custom branding"],
        },
        {
          id: "enterprise",
          name: "Enterprise",
          monthly_fee_cents: 29999,
          transaction_fee_percent: 1.5,
          features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee"],
        },
      ]
    } catch (error) {
      console.error("[v0] Failed to load demo data:", error)
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return redirect("/login")
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return redirect("/login")
    }

    // Fetch org
    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle()

    if (!orgData) {
      return redirect("/403")
    }

    org = orgData

    // Fetch pricing plans
    const { data: plans = [] } = await supabase
      .from("pricing_plans")
      .select("id, name, monthly_fee_cents, transaction_fee_percent, features")
      .eq("org_id", orgId)

    pricingPlans = plans as PricingPlan[]
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/orgs/${orgId}/dashboard`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pricing Plans</h1>
            <p className="text-muted-foreground mt-1">{org?.name}</p>
          </div>
        </div>

        {/* Plans Grid */}
        {pricingPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No pricing plans configured</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>Current plan for this organization</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">
                        ${(plan.monthly_fee_cents / 100).toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{plan.transaction_fee_percent}% per transaction</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features?.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action */}
                  <Button className="w-full mt-auto">View Details</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Pricing plans are managed by your account administrator. Contact support if you need to change your plan.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
