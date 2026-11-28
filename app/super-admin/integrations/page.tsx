import Link from "next/link"

import { saveIntegrationSettingsAction, setIntegrationSwitchAction } from "@/app/super-admin/integrations/actions"
import { disconnectChatwootAction, saveChatwootSettingsAction } from "@/app/super-admin/console-actions"
import { when } from "@/components/super-admin/console-ui"
import { IntegrationCard, type IntegrationCardField, type IntegrationCardModel } from "@/components/super-admin/IntegrationCards"
import { ChatwootSettingsForm, DisconnectForm } from "@/components/super-admin/IntegrationForms"
import { ProviderReadinessPanel } from "@/components/super-admin/ProviderReadinessPanel"
import { emailsFor } from "@/lib/data/admin/console"
import { loadProviderReadiness } from "@/lib/data/admin/provider-readiness"
import { INTEGRATION_KINDS, INTEGRATIONS } from "@/lib/integrations/catalog"
import { loadIntegrationConfigs } from "@/lib/integrations/runtime"
import { getIntegrationStatuses, type IntegrationStatus } from "@/lib/integrations/status"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadStoredChatwootSettings } from "@/lib/support/chatwoot"

export const metadata = { title: "Integrations · Admin" }
export const dynamic = "force-dynamic"

/**
 * Integrations: one card per outside service, each with its own on/off switch
 * and only its own settings. Settings saved here are encrypted (secrets) and
 * take over from the Coolify environment with no redeploy; money providers
 * (MoMo, DeltaPay) keep their keys in Coolify and only get the switch.
 * Values from the environment are never shown, only whether they're set.
 */
export default async function IntegrationsPage() {
  await requireAdminRole(["super_admin"])
  const [statuses, rows, stored, readiness] = await Promise.all([
    getIntegrationStatuses(),
    loadIntegrationConfigs(),
    loadStoredChatwootSettings(),
    loadProviderReadiness(),
  ])
  const chatwootBy = stored?.updatedBy ? (await emailsFor(createAdminClient(), [stored.updatedBy])).get(stored.updatedBy) ?? "an admin" : null

  const byId = new Map<string, IntegrationStatus>(statuses.map((s) => [s.id, s]))
  const models: IntegrationCardModel[] = INTEGRATIONS.flatMap((integration) => {
    const status = byId.get(integration.id)
    if (!status) return []
    const row = rows.get(integration.id) ?? null
    const fields: IntegrationCardField[] = integration.settings.map((s) => {
      const savedValue = !s.secret && !s.envOnly ? row?.settings[s.name] ?? null : null
      const savedHint = s.secret ? row?.secretHints[s.name] ?? null : null
      const savedHere = !s.envOnly && (s.secret ? Boolean(row?.secretHints && s.name in row.secretHints) : Boolean(savedValue))
      return {
        name: s.name,
        label: s.label ?? s.name,
        hint: s.hint ?? null,
        secret: s.secret,
        required: s.required,
        envOnly: Boolean(s.envOnly),
        savedValue,
        savedHint: savedHint || null,
        savedHere,
        inEnv: Boolean(process.env[s.name]?.trim()),
      }
    })
    return [
      {
        id: integration.id,
        label: integration.label,
        purpose: integration.purpose,
        badge: status.badge,
        tone: status.tone,
        summary: status.summary,
        switchedOn: status.switchedOn,
        mode: integration.consoleMode,
        fields,
        missing: status.missing,
        readiness: status.readiness ?? null,
        oneAtATime: Boolean(integration.selectedBy),
      },
    ]
  })

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Integrations</h1>
        <p className="text-sm text-ink-3">
          Every outside service Ticketiv uses. Switch each one on or off, and connect it right here: saved settings take over from the
          Coolify environment straight away, with no redeploy. Payment keys for MoMo and DeltaPay stay in Coolify. Every change is in{" "}
          <Link href="/super-admin/settings-history?table=admin_integration_configs" className="text-accent hover:underline">
            Settings history
          </Link>
          , with secrets hidden.
        </p>
      </div>

      {INTEGRATION_KINDS.map(({ kind, label, oneAtATime }) => {
        const cards = models.filter((m) => byId.get(m.id)?.kind === kind)
        if (cards.length === 0) return null
        const active = cards.filter((c) => c.badge === "Active").length
        return (
          <section key={kind} className="flex flex-col gap-3" aria-labelledby={`kind-${kind}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`kind-${kind}`} className="text-lg font-semibold tracking-tight text-ink">
                {label}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{oneAtATime ? "One at a time" : `${active} of ${cards.length} active`}</span>
            </div>
            {cards.map((model) =>
              model.id === "chatwoot" ? (
                <IntegrationCard
                  key={model.id}
                  model={model}
                  switchAction={setIntegrationSwitchAction}
                  saveAction={saveIntegrationSettingsAction}
                  canEdit
                  footer={
                    <>
                      <p className="text-xs text-ink-3">
                        Powers <Link href="/super-admin/cases" className="text-accent hover:underline">Cases</Link>.
                        {stored?.updatedAt ? ` Saved here${chatwootBy ? ` by ${chatwootBy}` : ""} · ${when(stored.updatedAt)}.` : ""} &ldquo;Test and
                        save&rdquo; checks the address, account and token with Chatwoot before saving anything.
                      </p>
                      {stored ? (
                        <div className="border-t border-line pt-4">
                          <DisconnectForm action={disconnectChatwootAction} />
                        </div>
                      ) : null}
                    </>
                  }
                >
                  <ChatwootSettingsForm
                    action={saveChatwootSettingsAction}
                    baseUrl={stored?.baseUrl ?? process.env.CHATWOOT_BASE_URL?.trim() ?? ""}
                    accountId={stored?.accountId ?? process.env.CHATWOOT_ACCOUNT_ID?.trim() ?? ""}
                    tokenHint={stored?.tokenHint ?? null}
                    hasSavedToken={Boolean(stored?.tokenEncrypted)}
                  />
                </IntegrationCard>
              ) : (
                <IntegrationCard key={model.id} model={model} switchAction={setIntegrationSwitchAction} saveAction={saveIntegrationSettingsAction} canEdit />
              ),
            )}
          </section>
        )
      })}

      <div id="payment-readiness" className="flex scroll-mt-6 flex-col gap-1 pt-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Payment providers: going live</h2>
        <p className="text-sm text-ink-3">
          A provider takes real money only once its checklist is complete and it is approved here, even when its switch is on. Test
          payments keep working until then. Emergency disable switches a provider off at checkout immediately.
        </p>
      </div>
      {readiness.map((provider) => (
        <ProviderReadinessPanel key={provider.provider} provider={provider} />
      ))}
    </div>
  )
}
