import "server-only"

import { decryptPayoutDetails } from "@/lib/payout-crypto-core"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  INTEGRATIONS,
  integrationsOfKind,
  type EnvSnapshot,
  type IntegrationDescriptor,
  type IntegrationKind,
} from "@/lib/integrations/catalog"

// Run-time settings for every integration: the console's saved values
// (admin_integration_configs) layered over the Coolify environment.
//
//   no row             → environment only (behaviour before the console)
//   row, enabled=false → switched off: the integration reads as unconfigured
//   row, enabled=true  → each setting = saved value, else the env variable
//
// Envelope-only settings (envOnly, e.g. live-mode flags) always come from the
// environment. Values are cached for a few seconds per server process so a
// webhook burst doesn't hit the database per message; saving in the console
// clears the cache in the process that saved.

export interface StoredIntegrationConfig {
  provider: string
  enabled: boolean
  settings: Record<string, string>
  secretsEncrypted: string | null
  secretHints: Record<string, string>
  updatedBy: string | null
  updatedAt: string | null
}

export type IntegrationSource = "console" | "environment" | "off"

export interface ResolvedIntegration {
  integration: IntegrationDescriptor
  source: IntegrationSource
  /** This integration's settings only, by environment variable name. */
  env: EnvSnapshot
}

const TTL_MS = 10_000
let cached: { at: number; rows: Map<string, StoredIntegrationConfig> } | null = null

export function invalidateIntegrationConfigCache() {
  cached = null
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === "string") out[k] = v
  return out
}

/** Every saved integration row. An unreadable table (before the migration, tests) reads as "none saved". */
export async function loadIntegrationConfigs(): Promise<Map<string, StoredIntegrationConfig>> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rows
  let rows = new Map<string, StoredIntegrationConfig>()
  try {
    const db = createAdminClient() as unknown as { from: (table: string) => any }
    const { data, error } = await db
      .from("admin_integration_configs")
      .select("provider, enabled, settings, secrets_encrypted, secret_hints, updated_by, updated_at")
    if (!error) {
      rows = new Map(
        ((data ?? []) as Array<Record<string, unknown>>).map((r) => [
          String(r.provider),
          {
            provider: String(r.provider),
            enabled: r.enabled === true,
            settings: asStringRecord(r.settings),
            secretsEncrypted: typeof r.secrets_encrypted === "string" ? r.secrets_encrypted : null,
            secretHints: asStringRecord(r.secret_hints),
            updatedBy: typeof r.updated_by === "string" ? r.updated_by : null,
            updatedAt: typeof r.updated_at === "string" ? r.updated_at : null,
          },
        ]),
      )
    }
  } catch {
    // No service-role client (tests, misconfigured env): environment only.
  }
  cached = { at: Date.now(), rows }
  return rows
}

export async function loadIntegrationConfig(provider: string): Promise<StoredIntegrationConfig | null> {
  return (await loadIntegrationConfigs()).get(provider) ?? null
}

/** Decrypted secrets of a saved row. Empty when none, or when the encryption key changed. */
export function decryptIntegrationSecrets(encrypted: string | null): Record<string, string> {
  if (!encrypted) return {}
  try {
    return asStringRecord(decryptPayoutDetails(encrypted))
  } catch {
    return {}
  }
}

/** Pure: layer a saved row over the environment for one integration. */
export function layerIntegrationEnv(
  integration: IntegrationDescriptor,
  row: StoredIntegrationConfig | null,
  secrets: Record<string, string>,
  env: EnvSnapshot,
): ResolvedIntegration {
  const names = integration.settings.map((s) => s.name)
  if (row && !row.enabled) {
    // Switched off: keep env-only safety flags, blank everything else.
    const out: EnvSnapshot = {}
    for (const s of integration.settings) if (s.envOnly) out[s.name] = env[s.name]
    return { integration, source: "off", env: out }
  }
  const out: EnvSnapshot = {}
  for (const name of names) out[name] = env[name]
  if (integration.selectedBy) out[integration.selectedBy.name] = env[integration.selectedBy.name]
  if (!row || integration.consoleMode !== "full") return { integration, source: row ? "console" : "environment", env: out }
  for (const s of integration.settings) {
    if (s.envOnly) continue
    const saved = s.secret ? secrets[s.name] : row.settings[s.name]
    if (saved?.trim()) out[s.name] = saved.trim()
  }
  // A switched-on console row selects its provider on one-at-a-time channels.
  if (integration.selectedBy) out[integration.selectedBy.name] = integration.selectedBy.value
  return { integration, source: "console", env: out }
}

function descriptor(id: string): IntegrationDescriptor {
  const found = INTEGRATIONS.find((i) => i.id === id)
  if (!found) throw new Error(`Unknown integration: ${id}`)
  return found
}

/** One integration's effective settings. */
export async function resolveIntegration(id: string, env: EnvSnapshot = process.env): Promise<ResolvedIntegration> {
  const integration = descriptor(id)
  const row = await loadIntegrationConfig(id)
  const secrets = row?.enabled && integration.consoleMode === "full" ? decryptIntegrationSecrets(row.secretsEncrypted) : {}
  return layerIntegrationEnv(integration, row, secrets, env)
}

/**
 * Pure: which provider a one-at-a-time channel (SMS, WhatsApp) uses. A
 * provider switched on in the console wins; otherwise the environment's
 * selector picks one, unless that provider is switched off in the console.
 */
export function pickChannelProvider(
  kind: IntegrationKind,
  rows: Map<string, StoredIntegrationConfig>,
  env: EnvSnapshot,
): IntegrationDescriptor | null {
  const candidates = integrationsOfKind(kind)
  const switchedOn = candidates.find((c) => rows.get(c.id)?.enabled)
  if (switchedOn) return switchedOn
  const bySelector = candidates.find((c) => c.selectedBy && env[c.selectedBy.name]?.trim() === c.selectedBy.value)
  if (!bySelector) return null
  return rows.get(bySelector.id)?.enabled === false ? null : bySelector
}

/** The active provider of a one-at-a-time channel and its settings, or null when none is set up. */
export async function resolveChannel(kind: "sms" | "whatsapp", env: EnvSnapshot = process.env): Promise<ResolvedIntegration | null> {
  const rows = await loadIntegrationConfigs()
  const picked = pickChannelProvider(kind, rows, env)
  return picked ? resolveIntegration(picked.id, env) : null
}

/** Whether every required setting of a resolved integration has a value. */
export function hasRequiredSettings(resolved: ResolvedIntegration): boolean {
  if (resolved.source === "off") return false
  return resolved.integration.settings.every((s) => !s.required || Boolean(resolved.env[s.name]?.trim()))
}

/** Tail shown in the console for a saved secret. */
export function secretHint(value: string): string {
  return value.length <= 8 ? "" : value.slice(-4)
}
