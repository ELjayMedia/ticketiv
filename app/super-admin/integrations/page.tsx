import Link from "next/link"

import { disconnectChatwootAction, saveChatwootSettingsAction } from "@/app/super-admin/console-actions"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { ChatwootSettingsForm, DisconnectForm } from "@/components/super-admin/IntegrationForms"
import { IntegrationOverview } from "@/components/super-admin/IntegrationOverview"
import { ProviderReadinessPanel } from "@/components/super-admin/ProviderReadinessPanel"
import { emailsFor } from "@/lib/data/admin/console"
import { loadProviderReadiness } from "@/lib/data/admin/provider-readiness"
import { getIntegrationStatuses } from "@/lib/integrations/status"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getChatwootConfig, loadStoredChatwootSettings } from "@/lib/support/chatwoot"

export const metadata = { title: "Integrations · Admin" }

export default async function IntegrationsPage() {
  await requireAdminRole(["super_admin"])
  const [stored, active, statuses, readiness] = await Promise.all([
    loadStoredChatwootSettings(),
    getChatwootConfig(),
    getIntegrationStatuses(),
    loadProviderReadiness(),
  ])
  const updatedBy = stored?.updatedBy ? (await emailsFor(createAdminClient(), [stored.updatedBy])).get(stored.updatedBy) ?? "an admin" : null

  // Prefill from what's in use. Never the token.
  const envBase = process.env.CHATWOOT_BASE_URL?.trim() ?? ""
  const envAccount = process.env.CHATWOOT_ACCOUNT_ID?.trim() ?? ""
  const status = active.ok
    ? active.source === "console"
      ? { label: "Connected", tone: "success" as const, detail: `Saved here${updatedBy ? ` by ${updatedBy}` : ""}${stored?.updatedAt ? ` · ${when(stored.updatedAt)}` : ""}` }
      : { label: "Connected", tone: "success" as const, detail: "Using the CHATWOOT_* environment variables in Vercel. Saving here takes over from them." }
    : { label: "Not connected", tone: "warning" as const, detail: active.problem ?? "Fill in the three fields below." }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Integrations</h1>
        <p className="text-sm text-ink-3">
          Every outside service Ticketiv uses, and whether it is working. Most are set as environment variables in Vercel (names shown,
          values never); Chatwoot can be connected right here, with no redeploy.
        </p>
      </div>

      <IntegrationOverview statuses={statuses} />

      <div id="payment-readiness" className="flex scroll-mt-6 flex-col gap-1 pt-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Payment providers: going live</h2>
        <p className="text-sm text-ink-3">
          A provider takes real money only once its checklist is complete and it is approved here. Test payments keep working until then.
          Emergency disable switches a provider off at checkout immediately.
        </p>
      </div>
      {readiness.map((provider) => (
        <ProviderReadinessPanel key={provider.provider} provider={provider} />
      ))}

      <h2 className="pt-2 text-lg font-semibold tracking-tight text-ink">Connect from the console</h2>

      <Panel title="Chatwoot" aside={<Pill tone={status.tone}>{status.label}</Pill>}>
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Powers <Link href="/super-admin/cases" className="text-accent hover:underline">Cases</Link>: conversations matched to people and orders, replies
            and resolving from the console. {status.detail}
          </p>
          <ChatwootSettingsForm
            action={saveChatwootSettingsAction}
            baseUrl={stored?.baseUrl ?? envBase}
            accountId={stored?.accountId ?? envAccount}
            tokenHint={stored?.tokenHint ?? null}
            hasSavedToken={Boolean(stored?.tokenEncrypted)}
          />
          <p className="text-xs text-ink-3">
            &ldquo;Test and save&rdquo; checks the address, account and token with Chatwoot before saving anything. Every change is in{" "}
            <Link href="/super-admin/settings-history?table=admin_integration_settings" className="text-accent hover:underline">
              Settings history
            </Link>
            , with the token hidden.
          </p>
          {stored ? (
            <div className="border-t border-line pt-4">
              <DisconnectForm action={disconnectChatwootAction} />
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}
