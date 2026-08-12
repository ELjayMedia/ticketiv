import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { PricingPlanForm } from "./PricingPlanForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Pricing & fees · Super admin" }

type PricingSearchParams = {
  status?: string
  risk?: string
  org?: string
}

type PricingPlanRow = {
  id: string
  org_id: string
  platform_percent_bps: number
  processor_percent_bps: number
  processor_fixed_cents: number
  min_platform_fee_cents: number | null
  currency: string
  active: boolean
  effective_from: string
  created_at: string
}

type AuditRow = {
  id: string
  org_id: string | null
  actor_id: string | null
  record_id: string | null
  changes: unknown
  created_at: string | null
}

function percent(bps: number | null | undefined) {
  return `${((bps ?? 0) / 100).toFixed(2)}%`
}

function money(cents: number | null | undefined, currency: string) {
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100)
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-SZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function shortId(value: string | null | undefined) {
  if (!value) return "system"
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

function auditChange(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const previous = record.previous && typeof record.previous === "object" && !Array.isArray(record.previous)
    ? record.previous as Record<string, unknown>
    : null
  const next = record.next && typeof record.next === "object" && !Array.isArray(record.next)
    ? record.next as Record<string, unknown>
    : null
  return { previous, next }
}

export default async function SuperAdminPricingPage({
  searchParams,
}: {
  searchParams?: Promise<PricingSearchParams>
}) {
  await requireAdminRole(["super_admin"])
  const params = searchParams ? await searchParams : {}
  const admin = createAdminClient()

  const [organizationsResult, plansResult, auditResult] = await Promise.all([
    admin.from("organizations").select("id, name").order("name", { ascending: true }).limit(500),
    admin
      .from("pricing_plans")
      .select("id, org_id, platform_percent_bps, processor_percent_bps, processor_fixed_cents, min_platform_fee_cents, currency, active, effective_from, created_at")
      .order("effective_from", { ascending: false })
      .limit(500),
    admin
      .from("audit_log")
      .select("id, org_id, actor_id, record_id, changes, created_at")
      .eq("table_name", "pricing_plans")
      .order("created_at", { ascending: false })
      .limit(80),
  ])

  if (organizationsResult.error) throw new Error(organizationsResult.error.message)
  if (plansResult.error) throw new Error(plansResult.error.message)
  if (auditResult.error) throw new Error(auditResult.error.message)

  const organizations = (organizationsResult.data ?? []).map((org) => ({
    id: org.id,
    name: org.name,
  }))
  const plans = (plansResult.data ?? []) as PricingPlanRow[]
  const audits = (auditResult.data ?? []) as AuditRow[]
  const activeByOrg = new Map(plans.filter((plan) => plan.active).map((plan) => [plan.org_id, plan]))
  const orgNameById = new Map(organizations.map((org) => [org.id, org.name]))

  const formOrganizations = organizations.map((org) => ({
    ...org,
    activePlan: activeByOrg.get(org.id) ?? null,
  }))

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">MONEY / PRICING</div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h1">Pricing & fees</h1>
          <Chip size="sm" variant="muted">Super admin only</Chip>
        </div>
        <p className="max-w-3xl text-[13px] leading-5 text-ink-3">
          Create effective-dated sales-commission versions without rewriting historical orders. Each save retires the current organization plan, creates a new version, and records an audit entry.
        </p>
      </div>

      {params.status === "pricing_updated" ? (
        <Card className={params.risk === "margin_risk" ? "border-danger/40" : "border-accent/30"}>
          <CardBody className="p-4">
            <p className="text-[13px] font-semibold text-ink">
              {params.risk === "margin_risk" ? "Pricing version saved with a margin warning." : "Pricing version saved."}
            </p>
            <p className="mt-1 text-[12px] text-ink-3">
              The new rate applies to future unsnapshotted orders only. Existing order snapshots remain unchanged.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="p-5">
          <div className="mb-5">
            <p className="text-h3">Order commission</p>
            <p className="mt-1 text-[12px] leading-5 text-ink-3">
              Processor cost is stored as an internal reconciliation reference. It is absorbed inside the platform commission and is not presented to organizers as a second fee.
            </p>
          </div>
          <PricingPlanForm organizations={formOrganizations} initialOrgId={params.org ?? null} />
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardBody className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-h3">Current organization plans</p>
                <p className="mt-1 text-[12px] text-ink-3">Only the active version is used when a new order has no pricing snapshot yet.</p>
              </div>
              <Chip size="sm" variant="muted">{activeByOrg.size} active</Chip>
            </div>
          </CardBody>
          <CardDivider />
          <div className="divide-y divide-line">
            {organizations.map((org) => {
              const plan = activeByOrg.get(org.id)
              return (
                <div key={org.id} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{org.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      {plan ? `Effective ${formatDate(plan.effective_from)}` : "No active pricing plan"}
                    </p>
                  </div>
                  {plan ? (
                    <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right font-mono text-[11px] text-ink-3">
                      <span>Commission</span><span className="font-semibold text-ink">{percent(plan.platform_percent_bps)}</span>
                      <span>Fee floor</span><span className="font-semibold text-ink">{money(plan.min_platform_fee_cents, plan.currency)}</span>
                    </div>
                  ) : (
                    <Link href={`/super-admin/pricing?org=${encodeURIComponent(org.id)}`} className="text-[12px] font-semibold text-accent underline-offset-4 hover:underline">
                      Configure
                    </Link>
                  )}
                </div>
              )
            })}
            {!organizations.length ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink-3">No organizations found.</div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardBody className="p-5">
            <p className="text-h3">Payout policy boundary</p>
            <p className="mt-2 text-[12px] leading-5 text-ink-3">
              Withdrawal fees and minimum payout thresholds stay outside order math. They are not changed by this screen, so saving a sales-pricing version cannot alter payout amounts.
            </p>
            <p className="mt-3 text-[12px] leading-5 text-ink-3">
              Payout configuration remains tied to the withdrawal/provider-transfer work before those controls can be safely exposed here.
            </p>
            <Link href="/super-admin/payouts" className="mt-4 inline-flex text-[12px] font-semibold text-accent underline-offset-4 hover:underline">
              Open payout operations
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-h3">Pricing change history</p>
              <p className="mt-1 text-[12px] text-ink-3">Who changed the rate, what changed, and when it became effective.</p>
            </div>
            <Link href="/super-admin/audit?table=pricing_plans" className="text-[12px] font-semibold text-accent underline-offset-4 hover:underline">
              Open full audit log
            </Link>
          </div>
        </CardBody>
        <CardDivider />
        <div className="divide-y divide-line">
          {audits.map((entry) => {
            const change = auditChange(entry.changes)
            const previous = change?.previous
            const next = change?.next
            const currency = typeof next?.currency === "string" ? next.currency : "ZAR"
            const previousBps = typeof previous?.platform_percent_bps === "number" ? previous.platform_percent_bps : null
            const nextBps = typeof next?.platform_percent_bps === "number" ? next.platform_percent_bps : null
            const nextFloor = typeof next?.min_platform_fee_cents === "number" ? next.min_platform_fee_cents : null

            return (
              <div key={entry.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{entry.org_id ? orgNameById.get(entry.org_id) ?? entry.org_id : "Platform"}</p>
                  <p className="mt-1 text-[12px] text-ink-3">
                    Commission {previousBps === null ? "created" : `${percent(previousBps)} →`} {nextBps === null ? "—" : percent(nextBps)}
                    {nextFloor === null ? "" : ` · floor ${money(nextFloor, currency)}`}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">Plan {shortId(entry.record_id)}</p>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 md:text-right">
                  <p>{formatDate(entry.created_at)}</p>
                  <p className="mt-1">Actor {shortId(entry.actor_id)}</p>
                </div>
              </div>
            )
          })}
          {!audits.length ? (
            <div className="px-5 py-8 text-center text-[13px] text-ink-3">No pricing changes have been recorded yet.</div>
          ) : null}
        </div>
      </Card>
    </main>
  )
}
