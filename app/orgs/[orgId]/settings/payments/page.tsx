import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { OrgPaymentProvidersForm } from "@/components/organizer/org-payment-providers-form"
import { requireOrgManager } from "@/lib/organizer/access"
import { getOrganizerPaymentProviderOptions } from "@/lib/payments/availability"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { saveOrgPaymentProvidersAction } from "./actions"

export const dynamic = "force-dynamic"

/** Organisation default payment methods (TICK-394). Credentials stay with Ticketiv. */
export default async function OrgPaymentMethodsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  await requireOrgManager(orgId)
  const supabase = createServerSupabaseClient() as any
  const [{ data: org }, options] = await Promise.all([
    supabase.from("organizations").select("name, payment_providers").eq("id", orgId).maybeSingle(),
    getOrganizerPaymentProviderOptions(),
  ])
  const current: string[] = Array.isArray(org?.payment_providers) ? org.payment_providers.map(String) : []

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div>
          <Link href={`/orgs/${orgId}/dashboard`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
            <Icon name="chevL" size={14} /> Back to dashboard
          </Link>
          <h1 className="text-h1">Payment methods</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            The default for every {org?.name ?? "organisation"} event. Each event can inherit it or choose fewer methods, and so can each
            ticket type. Card details are entered on the provider&apos;s secure page and never reach Ticketiv.
          </p>
        </div>
        <Card>
          <CardBody className="p-5">
            <OrgPaymentProvidersForm
              orgId={orgId}
              current={current}
              action={saveOrgPaymentProvidersAction}
              options={options.map((o) => ({ id: o.id, label: o.label, sub: o.sub, available: o.enabled && o.configured, note: o.warning }))}
            />
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
