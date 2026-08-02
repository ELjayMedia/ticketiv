import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { OnboardingChecklist } from "@/components/quiet/screens/organizer/onboarding-checklist"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { buildOrganizerSetupSteps } from "@/lib/data/organizer/readiness"

export const dynamic = "force-dynamic"

export default async function OrgOnboardingPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
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

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name, bio, logo")
    .eq("id", orgId)
    .maybeSingle()

  if (orgError || !org) {
    return redirect("/403")
  }

  const [eventsRes, publishedEventsRes, payoutAccountsRes, staffRes, devicesRes] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "published"),
    supabase
      .from("payout_accounts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("org_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ])

  const hasProfile = !!(org.bio && org.logo)
  const hasPayoutAccount = (payoutAccountsRes.count ?? 0) > 0
  const hasAnyEvent = (eventsRes.count ?? 0) > 0
  const hasPublishedEvent = (publishedEventsRes.count ?? 0) > 0
  const hasDevice = (devicesRes.count ?? 0) > 0
  const hasTeam = (staffRes.count ?? 0) > 1

  const steps = buildOrganizerSetupSteps({
    orgId,
    hasProfile,
    hasPayoutAccount,
    hasAnyEvent,
    hasPublishedEvent,
    hasDevice,
    hasTeam,
  })

  const doneCount = steps.filter((s) => s.done).length

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-10 p-6 max-w-3xl">

        {/* Welcome hero */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Icon name="spark" size={20} className="text-accent" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              Getting started
            </span>
          </div>
          <h1 className="text-h1">Welcome to Ticketiv, {org.name}!</h1>
          <p className="text-[15px] text-ink-2 max-w-xl">
            You&apos;re {doneCount} of {steps.length} steps away from selling tickets and managing
            events like a pro. Complete the checklist below to get fully set up.
          </p>
        </div>

        {/* Onboarding checklist */}
        <section className="flex flex-col gap-3">
          <h2 className="text-h2">Your setup checklist</h2>
          <OnboardingChecklist orgId={orgId} steps={steps} />
        </section>

        {/* Quick guides */}
        <section className="flex flex-col gap-4">
          <h2 className="text-h2">Quick guides</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <GuideCard
              icon="cal"
              title="Creating your first event"
              description="Start with your event name and date, then add ticket types (free, paid, VIP). Set capacity limits, then publish when ready to go live."
            />
            <GuideCard
              icon="wallet"
              title="Getting paid"
              description="Connect a bank account under Payouts. Funds are settled after each event — typically 2–5 business days after payout is requested."
            />
            <GuideCard
              icon="qr"
              title="Event day: scanner setup"
              description="Register devices per event under the event&apos;s Devices tab. Scanners work offline and sync when reconnected — no internet required at the gate."
            />
          </div>
        </section>

        {/* Help & support */}
        <section>
          <Card flat className="border-line">
            <CardBody className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-[14px] font-semibold text-ink">Need help?</h3>
                <p className="text-[13px] text-ink-3">
                  Our support team is here to help you get set up and selling.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="mailto:support@ticketiv.app"
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink hover:bg-bg"
                >
                  <Icon name="fileText" size={14} />
                  Contact support
                </Link>
                <Link
                  href={`/orgs/${orgId}/dashboard`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2"
                >
                  Go to dashboard
                  <Icon name="arrowR" size={14} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </section>

      </div>
    </main>
  )
}

function GuideCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft">
          <Icon name={icon as any} size={18} className="text-accent" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
          <p className="text-[12px] text-ink-3 leading-relaxed">{description}</p>
        </div>
      </CardBody>
    </Card>
  )
}
