"use server"

import { revalidatePath } from "next/cache"

import { untyped } from "@/lib/data/admin/console"
import { INTEGRATIONS, integrationsOfKind, type IntegrationDescriptor } from "@/lib/integrations/catalog"
import { checkIntegration } from "@/lib/integrations/checks"
import {
  decryptIntegrationSecrets,
  invalidateIntegrationConfigCache,
  layerIntegrationEnv,
  loadIntegrationConfigs,
  secretHint,
  type StoredIntegrationConfig,
} from "@/lib/integrations/runtime"
import { getIntegrationStatuses } from "@/lib/integrations/status"
import { getMomoConfigState } from "@/lib/payments/availability"
import { getDeltaPayConfig } from "@/lib/payments/deltapay"
import { getPaystackSettings } from "@/lib/payments/paystack-config"
import { isCheckoutProvider } from "@/lib/payments/providers/catalog"
import { encryptPayoutDetails, isPayoutEncryptionConfigured } from "@/lib/payout-crypto-core"
import { getDeltaPayWalletConfig } from "@/lib/payments/deltapay-wallet"
import { adminForAction } from "@/lib/super-admin/auth"
import type { ConsoleActionResult } from "@/lib/super-admin/console"
import { createAdminClient } from "@/lib/supabase/admin"
import { chatwootConfig } from "@/lib/support/chatwoot-core"
import { decryptChatwootToken, loadStoredChatwootSettings } from "@/lib/support/chatwoot"
import type { Json } from "@/types/database"

// Integrations cards (owner only, like the Chatwoot connection):
//   setIntegrationSwitchAction     the card's on/off switch
//   saveIntegrationSettingsAction  "Test and save" for console-editable settings
// Secrets are encrypted with the payout-details key and never returned; each
// change is audited and copied to settings history (secret columns masked).

const done = (message: string): ConsoleActionResult => ({ status: "done", message })
const fail = (message: string): ConsoleActionResult => ({ status: "error", message })
const NOT_ALLOWED = fail("Only the Ticketiv owner can change integrations.")

type Db = { from: (table: string) => any }

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function find(id: string): IntegrationDescriptor | null {
  return INTEGRATIONS.find((i) => i.id === id) ?? null
}

async function audit(actorId: string, provider: string, summary: string, details: Record<string, unknown> = {}) {
  const admin = createAdminClient()
  const { error } = await admin.from("audit_log").insert({
    org_id: null,
    actor_id: actorId,
    table_name: "admin_integration_configs",
    record_id: provider,
    action: "other",
    changes: { business_action: "admin_console", action: "manage_integrations", summary, ...details } as Json,
  })
  if (error) console.error("[integrations] audit insert failed", error.message)
}

function refresh() {
  invalidateIntegrationConfigCache()
  revalidatePath("/super-admin/integrations")
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/cases")
  revalidatePath("/super-admin/payouts")
}

async function upsertRow(db: Db, row: Partial<StoredIntegrationConfig> & { provider: string }, actorId: string) {
  const payload: Record<string, unknown> = { provider: row.provider, updated_by: actorId, updated_at: new Date().toISOString() }
  if (row.enabled !== undefined) payload.enabled = row.enabled
  if (row.settings !== undefined) payload.settings = row.settings
  if (row.secretsEncrypted !== undefined) payload.secrets_encrypted = row.secretsEncrypted
  if (row.secretHints !== undefined) payload.secret_hints = row.secretHints
  const { error } = await db.from("admin_integration_configs").upsert(payload, { onConflict: "provider" })
  return error ? String(error.message) : null
}

/** Why an integration can't be switched on yet, or null when it can. */
async function cannotSwitchOn(integration: IntegrationDescriptor, rows: Map<string, StoredIntegrationConfig>): Promise<string | null> {
  if (integration.kind === "payments" && isCheckoutProvider(integration.id)) {
    if (integration.id === "paystack") {
      const settings = await getPaystackSettings().catch((error: unknown) => {
        return { secretKey: null, error: error instanceof Error ? error.message : "unreadable" }
      })
      if ("error" in settings) return `Paystack's key can't be used: ${settings.error}`
      return settings.secretKey ? null : "Save a Paystack secret key on this card first."
    }
    if (integration.id === "momo") {
      const state = getMomoConfigState()
      return state.operational ? null : `MoMo isn't fully set up in Coolify: ${state.problems.join(" ")}`
    }
    const config = getDeltaPayConfig()
    return config.operational ? null : `DeltaPay isn't fully set up in Coolify: ${config.problems.join(" ")}`
  }
  if (integration.kind === "payouts") {
    const config = getDeltaPayWalletConfig()
    return config.operational ? null : `DeltaPay payouts aren't fully set up in Coolify: ${config.problems.join(" ")}`
  }
  if (integration.id === "chatwoot") {
    const stored = await loadStoredChatwootSettings()
    const cfg =
      stored && (stored.baseUrl || stored.accountId || stored.tokenEncrypted)
        ? chatwootConfig({
            CHATWOOT_BASE_URL: stored.baseUrl ?? undefined,
            CHATWOOT_ACCOUNT_ID: stored.accountId ?? undefined,
            CHATWOOT_API_TOKEN: decryptChatwootToken(stored.tokenEncrypted) ?? undefined,
          })
        : chatwootConfig(process.env)
    return cfg.ok ? null : "Connect Chatwoot on this card first (address, account ID and token)."
  }
  const row = rows.get(integration.id) ?? null
  const resolved = layerIntegrationEnv(
    integration,
    row ? { ...row, enabled: true } : { provider: integration.id, enabled: true, settings: {}, secretsEncrypted: null, secretHints: {}, updatedBy: null, updatedAt: null },
    decryptIntegrationSecrets(row?.secretsEncrypted ?? null),
    process.env,
  )
  const missing = integration.settings.filter((s) => s.required && !resolved.env[s.name]?.trim())
  return missing.length ? `Fill in ${missing.map((s) => s.label ?? s.name).join(", ")} and save first.` : null
}

export async function setIntegrationSwitchAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("manage_integrations")
  if (!context) return NOT_ALLOWED
  const integration = find(field(formData, "provider"))
  if (!integration) return fail("Unknown integration.")
  const on = field(formData, "on") === "true"
  const db = createAdminClient() as unknown as Db
  const rows = await loadIntegrationConfigs()

  if (on) {
    const problem = await cannotSwitchOn(integration, rows)
    if (problem) return fail(`Not switched on. ${problem}`)
  }

  if (integration.kind === "payments") {
    // Checkout providers keep their switch in payment_provider_settings, which
    // checkout already reads. Going live with real money still needs the
    // readiness approval further down the page.
    const { error } = await untyped(createAdminClient())
      .from("payment_provider_settings")
      .upsert({ provider: integration.id, is_enabled: on, updated_by: context.user.id }, { onConflict: "provider" })
    if (error) return fail(`Couldn't change it: ${error.message}`)
  } else {
    const problem = await upsertRow(db, { provider: integration.id, enabled: on }, context.user.id)
    if (problem) return fail(`Couldn't change it: ${problem}`)
    // One provider at a time on SMS and WhatsApp.
    if (on && integration.selectedBy) {
      for (const other of integrationsOfKind(integration.kind)) {
        if (other.id === integration.id) continue
        const error = await upsertRow(db, { provider: other.id, enabled: false }, context.user.id)
        if (error) return fail(`Switched on, but couldn't switch off ${other.label}: ${error}`)
      }
    }
  }

  await audit(context.user.id, integration.id, `${integration.label} switched ${on ? "on" : "off"}`, { enabled: on })
  refresh()
  const others = on && integration.selectedBy ? ` Other ${integration.kind === "sms" ? "SMS" : "WhatsApp"} providers are now off.` : ""
  return done(on ? `${integration.label} is on.${others}` : `${integration.label} is off.`)
}

export async function saveIntegrationSettingsAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("manage_integrations")
  if (!context) return NOT_ALLOWED
  const integration = find(field(formData, "provider"))
  if (!integration || integration.consoleMode !== "full" || integration.id === "chatwoot") {
    return fail("This integration's settings can't be changed here.")
  }

  const rows = await loadIntegrationConfigs()
  const existing = rows.get(integration.id) ?? null
  const secrets = decryptIntegrationSecrets(existing?.secretsEncrypted ?? null)
  if (existing?.secretsEncrypted && Object.keys(secrets).length === 0) {
    // The key changed: old secrets are unreadable, so they must be entered again.
    for (const s of integration.settings) if (s.secret) delete secrets[s.name]
  }
  const settings: Record<string, string> = { ...(existing?.settings ?? {}) }
  const hints: Record<string, string> = { ...(existing?.secretHints ?? {}) }
  let secretsChanged = false

  for (const s of integration.settings) {
    if (s.envOnly) continue
    const value = field(formData, s.name)
    if (value.length > 4000) return fail(`${s.label ?? s.name} is too long.`)
    if (s.secret) {
      if (formData.get(`clear:${s.name}`) === "on") {
        delete secrets[s.name]
        delete hints[s.name]
        secretsChanged = true
      } else if (value) {
        secrets[s.name] = value
        hints[s.name] = secretHint(value)
        secretsChanged = true
      }
    } else if (value) {
      settings[s.name] = value
    } else {
      delete settings[s.name]
    }
  }

  // Test what the app would actually use: saved values over Coolify's.
  const probeRow: StoredIntegrationConfig = {
    provider: integration.id,
    enabled: true,
    settings,
    secretsEncrypted: null,
    secretHints: hints,
    updatedBy: null,
    updatedAt: null,
  }
  const effective = layerIntegrationEnv(integration, probeRow, secrets, process.env)
  const missing = integration.settings.filter((s) => s.required && !effective.env[s.name]?.trim())
  if (missing.length) return fail(`Not saved. Fill in ${missing.map((s) => s.label ?? s.name).join(", ")}.`)

  const check = await checkIntegration(integration.id, effective.env)
  if (!check.ok) return fail(`Not saved: ${check.error}`)

  let secretsEncrypted = existing?.secretsEncrypted ?? null
  if (secretsChanged || (existing?.secretsEncrypted && Object.keys(secrets).length === 0)) {
    if (Object.keys(secrets).length === 0) {
      secretsEncrypted = null
    } else {
      if (!isPayoutEncryptionConfigured()) {
        return fail("Not saved: the server's encryption key (PAYOUT_ENCRYPTION_KEY) isn't set, so secrets can't be stored safely.")
      }
      secretsEncrypted = encryptPayoutDetails(secrets)
    }
  }

  // Keep the switch where it was. A first save keeps today's state (on when the
  // provider is already the one in use), so saving never silently takes over
  // a channel; Paystack's switch lives in payment_provider_settings.
  let enabled = existing?.enabled
  if (enabled === undefined) {
    if (integration.kind === "payments") enabled = true
    else {
      const status = (await getIntegrationStatuses()).find((s) => s.id === integration.id)
      enabled = Boolean(status?.switchedOn)
    }
  }

  const db = createAdminClient() as unknown as Db
  const problem = await upsertRow(db, { provider: integration.id, enabled, settings, secretsEncrypted, secretHints: hints }, context.user.id)
  if (problem) return fail(`Not saved: ${problem}`)

  await audit(context.user.id, integration.id, `${integration.label} settings saved in the console`, {
    settings: Object.keys(settings),
    secrets: Object.keys(secrets),
  })
  refresh()
  const tail = enabled || integration.kind === "payments" ? "" : " It's off: switch it on to start using it."
  return done(`Saved. ${check.message}${tail}`)
}
