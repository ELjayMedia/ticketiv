import Link from "next/link"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { formatPlatformFeeRate, rateFromSettingRow } from "@/lib/fees/platform-fee"
import { PlatformFeeForm } from "./PlatformFeeForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Pricing & fees · Super admin" }

type FeeSettingRow = {
  id: string
  percent_bps: number
  fixed_per_ticket_cents: number
  currency: string
  active: boolean
  effective_from: string
  created_by: string | null
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

/**
 * `/super-admin/pricing` — Ticketiv's platform fee. One rate for every
 * organisation: a percentage of each ticket plus a fixed amount per ticket,
 * deducted from organizer payouts (buyers pay the ticket price). Stored in
 * public.platform_fee_settings and changed via admin_set_platform_fee.
 */
export default async function SuperAdminPricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  await requireAdminRole(["super_admin"])
  const params = searchParams ? await searchParams : {}
  const admin = createAdminClient()

  const { data, error } = await (admin as any)
    .from("platform_fee_settings")
    .select("id, percent_bps, fixed_per_ticket_cents, currency, active, effective_from, created_by")
    .order("effective_from", { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)

  const settings = (data ?? []) as FeeSettingRow[]
  const active = settings.find((row) => row.active) ?? null
  const current = rateFromSettingRow(active)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">MONEY / PRICING</div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h1">Pricing & fees</h1>
          <Chip size="sm" variant="muted">Super admin only</Chip>
        </div>
        <p className="max-w-3xl text-[13px] leading-5 text-ink-3">
          Ticketiv&apos;s fee on every ticket sold through the platform. One rate applies to all organisations. It is
          deducted from the organizer&apos;s payout; buyers pay only the ticket price.
        </p>
      </div>

      {params.status === "fee_updated" ? (
        <Card className="border-accent/30">
          <CardBody className="p-4">
            <p className="text-[13px] font-semibold text-ink">Platform fee saved. New orders use {formatPlatformFeeRate(current)}.</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-h3">Platform fee</p>
              <p className="mt-1 text-[12px] text-ink-3">
                {active ? `In effect since ${formatDate(active.effective_from)}` : "No fee has been set yet."}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Current</p>
              <p className="font-mono text-[18px] font-semibold tabular-nums text-ink">{formatPlatformFeeRate(current)}</p>
            </div>
          </div>
          <PlatformFeeForm current={current} />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardBody className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-h3">Fee history</p>
                <p className="mt-1 text-[12px] text-ink-3">Every rate that has applied, newest first.</p>
              </div>
              <Link href="/super-admin/audit?table=platform_fee_settings" className="text-[12px] font-semibold text-accent underline-offset-4 hover:underline">
                Open audit log
              </Link>
            </div>
          </CardBody>
          <CardDivider />
          <div className="divide-y divide-line">
            {settings.map((row) => (
              <div key={row.id} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                    {formatPlatformFeeRate(rateFromSettingRow(row))}
                  </span>
                  {row.active ? <Chip size="sm" variant="accent">Current</Chip> : null}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 sm:text-right">
                  {formatDate(row.effective_from)} · {shortId(row.created_by)}
                </div>
              </div>
            ))}
            {!settings.length ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink-3">No platform fee has been recorded yet.</div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardBody className="p-5">
            <p className="text-h3">Payout policy boundary</p>
            <p className="mt-2 text-[12px] leading-5 text-ink-3">
              Withdrawal fees and minimum payout thresholds stay outside order math. They are not changed by this screen;
              the platform fee is recorded on each order when it is placed and settles into the ledger at payment.
            </p>
            <Link href="/super-admin/payouts" className="mt-4 inline-flex text-[12px] font-semibold text-accent underline-offset-4 hover:underline">
              Open payout operations
            </Link>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
