import Link from "next/link"

import { disconnectChatwootAction, saveChatwootSettingsAction } from "@/app/super-admin/console-actions"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { ChatwootSettingsForm, DisconnectForm } from "@/components/super-admin/IntegrationForms"
import { emailsFor } from "@/lib/data/admin/console"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getChatwootConfig, loadStoredChatwootSettings } from "@/lib/support/chatwoot"

export const metadata = { title: "Integrations · Admin" }

export default async function IntegrationsPage() {
  await requireAdminRole(["super_admin"])
  const [stored, active] = await Promise.all([loadStoredChatwootSettings(), getChatwootConfig()])
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
        <p className="text-sm text-ink-3">Connect outside tools from here. Changes take effect immediately, with no redeploy.</p>
      </div>

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
