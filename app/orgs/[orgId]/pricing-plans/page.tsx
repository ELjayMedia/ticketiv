import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { requireOrgCapability } from "@/lib/data/organizer/access"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { formatPrice } from "@/lib/format"
import {
  formatPlatformFeeRate,
  organizerNetPerTicketCents,
  rateFromSettingRow,
  ticketFeeCents,
} from "@/lib/fees/platform-fee"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ticketiv fees" }

const EXAMPLE_PRICES_CENTS = [5000, 15000, 50000]

/**
 * `/orgs/[orgId]/pricing-plans` — what Ticketiv charges this organisation.
 * One platform-wide rate (public.platform_fee_settings), deducted from
 * payouts. Set by super admins under Pricing & fees.
 */
export default async function PricingPlansPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  await requireOrgCapability(orgId, "manage")

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const { data: setting } = await (supabase as any)
    .from("platform_fee_settings")
    .select("percent_bps, fixed_per_ticket_cents, currency, effective_from")
    .eq("active", true)
    .maybeSingle()
  const rate = rateFromSettingRow(setting)
  const hasFee = rate.percentBps > 0 || rate.fixedPerTicketCents > 0

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Settings</span>
        <h1 className="text-h1">Ticketiv fees</h1>
        <p className="text-[13px] text-ink-3">What Ticketiv keeps from each ticket you sell.</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-h3">Platform fee</p>
            <p className="font-mono text-[18px] font-semibold tabular-nums text-ink">{formatPlatformFeeRate(rate)}</p>
          </div>
          <p className="text-[13px] leading-5 text-ink-2">
            {hasFee
              ? "Taken from your payout for every paid ticket. Your buyers pay only the ticket price, and free tickets are never charged."
              : "Ticketiv currently takes no fee. Your buyers pay only the ticket price."}
          </p>

          {hasFee ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="pb-1.5 font-medium">Ticket price</th>
                  <th className="pb-1.5 text-right font-medium">Ticketiv fee</th>
                  <th className="pb-1.5 text-right font-medium">You receive</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                {EXAMPLE_PRICES_CENTS.map((price) => (
                  <tr key={price} className="border-t border-line">
                    <td className="py-2">{formatPrice(price, rate.currency, { decimals: true })}</td>
                    <td className="py-2 text-right">{formatPrice(ticketFeeCents(price, rate), rate.currency, { decimals: true })}</td>
                    <td className="py-2 text-right">{formatPrice(organizerNetPerTicketCents(price, rate), rate.currency, { decimals: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {setting?.effective_from ? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              In effect since {new Date(setting.effective_from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <p className="text-[12px] leading-5 text-ink-3">
        Each order keeps the fee that applied when it was placed. Your payouts and finance pages show the fees deducted
        so far. Questions about fees? Contact Ticketiv support.
      </p>
    </main>
  )
}
