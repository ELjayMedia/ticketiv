import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export const TAPBAND_CAPABILITIES = [
  "product_visibility",
  "credential_lookup",
  "credential_provisioning",
  "customer_activation",
  "outlet_identity_lookup",
  "outlet_ticket_assignment",
  "online_nfc_scanning",
  "offline_nfc_scanning",
  "offline_manifest_issuance",
  "qr_fallback",
  "lost_replacement",
  "desfire_secure_mode",
] as const

export type TapBandCapability = (typeof TAPBAND_CAPABILITIES)[number]
export type TapBandChannel = "nfc" | "qr" | "serial" | "manual" | "system"

export interface TapBandFeatureConfigRow {
  id?: string
  environment: string
  org_id?: string | null
  event_id?: string | null
  enabled: boolean
  product_visibility_enabled: boolean
  credential_lookup_enabled: boolean
  provisioning_enabled: boolean
  activation_enabled: boolean
  outlet_lookup_enabled: boolean
  outlet_sales_enabled: boolean
  online_nfc_scanning_enabled: boolean
  offline_nfc_scanning_enabled: boolean
  offline_manifest_issuance_enabled: boolean
  qr_fallback_enabled: boolean
  lost_replacement_enabled: boolean
  desfire_secure_mode_enabled: boolean
  allowed_chip_families?: string[] | null
  allowed_key_versions?: string[] | null
  supported_entry_zones?: string[] | null
  manifest_validity_seconds: number
  tap_debounce_ms: number
  outlet_verification_requirement: "none" | "staff_pin" | "phone_otp" | "identity_review" | string
  replacement_fee_cents: number
  replacement_fee_waiver_enabled: boolean
  effective_within_seconds: number
  public_client_config?: Record<string, unknown> | null
  updated_at?: string | null
}

export interface TapBandKillSwitchRow {
  id: string
  switch_type:
    | "all_credential_lookups"
    | "supplier_batch"
    | "chip_family"
    | "key_version"
    | "outlet"
    | "provisioning_device"
    | "nfc_scanning"
    | "offline_manifest_issuance"
    | "customer_replacement"
    | string
  environment: string
  org_id?: string | null
  event_id?: string | null
  target_ref?: string | null
  capability?: string | null
  reason_code: string
  reason: string
  enabled: boolean
  starts_at: string
  ends_at?: string | null
  created_at?: string | null
}

export interface TapBandAccessContext {
  environment?: string | null
  orgId?: string | null
  eventId?: string | null
  capability?: TapBandCapability | null
  channel?: TapBandChannel | string | null
  supplierBatch?: string | null
  chipFamily?: string | null
  keyVersion?: string | null
  outletId?: string | null
  deviceId?: string | null
  entryZone?: string | null
  now?: string | Date | null
}

export interface EffectiveTapBandConfig {
  environment: string
  orgId: string | null
  eventId: string | null
  enabled: boolean
  capabilities: Record<TapBandCapability, boolean>
  allowedChipFamilies: string[]
  allowedKeyVersions: string[]
  supportedEntryZones: string[]
  manifestValiditySeconds: number
  tapDebounceMs: number
  outletVerificationRequirement: string
  replacementFeeCents: number
  replacementFeeWaiverEnabled: boolean
  effectiveWithinSeconds: number
  publicClientConfig: Record<string, unknown>
  sourceConfigId: string | null
  updatedAt: string | null
}

export interface TapBandAccessDecision {
  allowed: boolean
  reasonCode: string
  reason: string
  config: EffectiveTapBandConfig
  matchedKillSwitch: Pick<TapBandKillSwitchRow, "id" | "switch_type" | "target_ref" | "reason_code"> | null
}

const DEFAULT_MANIFEST_VALIDITY_SECONDS = 900
const DEFAULT_TAP_DEBOUNCE_MS = 1500
const DEFAULT_EFFECTIVE_WITHIN_SECONDS = 60
const ALL_ENVIRONMENTS = "all"

const CAPABILITY_COLUMN: Record<TapBandCapability, keyof TapBandFeatureConfigRow> = {
  product_visibility: "product_visibility_enabled",
  credential_lookup: "credential_lookup_enabled",
  credential_provisioning: "provisioning_enabled",
  customer_activation: "activation_enabled",
  outlet_identity_lookup: "outlet_lookup_enabled",
  outlet_ticket_assignment: "outlet_sales_enabled",
  online_nfc_scanning: "online_nfc_scanning_enabled",
  offline_nfc_scanning: "offline_nfc_scanning_enabled",
  offline_manifest_issuance: "offline_manifest_issuance_enabled",
  qr_fallback: "qr_fallback_enabled",
  lost_replacement: "lost_replacement_enabled",
  desfire_secure_mode: "desfire_secure_mode_enabled",
}

const CREDENTIAL_LOOKUP_CAPABILITIES = new Set<TapBandCapability>([
  "credential_lookup",
  "outlet_identity_lookup",
  "online_nfc_scanning",
  "offline_nfc_scanning",
  "qr_fallback",
])

export function defaultTapBandConfig(environment = resolveTapBandEnvironment()): EffectiveTapBandConfig {
  return {
    environment,
    orgId: null,
    eventId: null,
    enabled: false,
    capabilities: Object.fromEntries(TAPBAND_CAPABILITIES.map((capability) => [capability, false])) as Record<
      TapBandCapability,
      boolean
    >,
    allowedChipFamilies: [],
    allowedKeyVersions: [],
    supportedEntryZones: [],
    manifestValiditySeconds: DEFAULT_MANIFEST_VALIDITY_SECONDS,
    tapDebounceMs: DEFAULT_TAP_DEBOUNCE_MS,
    outletVerificationRequirement: "phone_otp",
    replacementFeeCents: 0,
    replacementFeeWaiverEnabled: false,
    effectiveWithinSeconds: DEFAULT_EFFECTIVE_WITHIN_SECONDS,
    publicClientConfig: {},
    sourceConfigId: null,
    updatedAt: null,
  }
}

export function resolveEffectiveTapBandConfig(
  rows: TapBandFeatureConfigRow[],
  context: TapBandAccessContext = {},
): EffectiveTapBandConfig {
  const environment = normalizeEnvironment(context.environment)
  const matches = rows
    .filter((row) => featureConfigMatches(row, context, environment))
    .sort((a, b) => featureConfigSpecificity(a, environment) - featureConfigSpecificity(b, environment))

  return matches.reduce((effective, row) => applyFeatureConfigRow(effective, row), defaultTapBandConfig(environment))
}

export function evaluateTapBandAccess(
  configRows: TapBandFeatureConfigRow[],
  killSwitchRows: TapBandKillSwitchRow[],
  context: TapBandAccessContext = {},
): TapBandAccessDecision {
  const environment = normalizeEnvironment(context.environment)
  const config = resolveEffectiveTapBandConfig(configRows, { ...context, environment })
  const killSwitch = findMatchingKillSwitch(killSwitchRows, context, environment)

  if (killSwitch) {
    return {
      allowed: false,
      reasonCode: killSwitch.reason_code,
      reason: killSwitch.reason,
      config,
      matchedKillSwitch: {
        id: killSwitch.id,
        switch_type: killSwitch.switch_type,
        target_ref: killSwitch.target_ref ?? null,
        reason_code: killSwitch.reason_code,
      },
    }
  }

  if (!config.enabled) {
    return denied("tapband_disabled", "TapBand is disabled for this scope.", config)
  }

  const capability = context.capability ?? capabilityForChannel(context.channel)
  if (capability && !config.capabilities[capability]) {
    return denied(`tapband_${capability}_disabled`, `TapBand capability '${capability}' is disabled.`, config)
  }

  if (context.chipFamily && config.allowedChipFamilies.length > 0) {
    if (!config.allowedChipFamilies.includes(context.chipFamily)) {
      return denied("tapband_chip_family_not_allowed", "This TapBand chip family is not allowed for this scope.", config)
    }
  }

  if (context.keyVersion && config.allowedKeyVersions.length > 0) {
    if (!config.allowedKeyVersions.includes(context.keyVersion)) {
      return denied("tapband_key_version_not_allowed", "This TapBand key version is not allowed for this scope.", config)
    }
  }

  if (context.entryZone && config.supportedEntryZones.length > 0) {
    if (!config.supportedEntryZones.includes(context.entryZone)) {
      return denied("tapband_entry_zone_not_allowed", "TapBand is not enabled for this entry zone.", config)
    }
  }

  return {
    allowed: true,
    reasonCode: "tapband_allowed",
    reason: "TapBand is enabled for this scope.",
    config,
    matchedKillSwitch: null,
  }
}

export async function fetchTapBandAccessDecision(
  context: TapBandAccessContext,
): Promise<TapBandAccessDecision> {
  const environment = normalizeEnvironment(context.environment)
  const admin = createAdminClient()
  const [configs, killSwitches] = await Promise.all([
    (admin.from as any)("tapband_feature_configs")
      .select("*")
      .in("environment", [ALL_ENVIRONMENTS, environment])
      .limit(500),
    (admin.from as any)("tapband_kill_switches")
      .select("*")
      .in("environment", [ALL_ENVIRONMENTS, environment])
      .eq("enabled", true)
      .limit(500),
  ])

  if (configs.error) throw new Error(`Unable to load TapBand feature configuration: ${configs.error.message}`)
  if (killSwitches.error) throw new Error(`Unable to load TapBand kill switches: ${killSwitches.error.message}`)

  return evaluateTapBandAccess(
    (configs.data ?? []) as TapBandFeatureConfigRow[],
    (killSwitches.data ?? []) as TapBandKillSwitchRow[],
    { ...context, environment },
  )
}

export function safeTapBandConfigPayload(decision: TapBandAccessDecision) {
  const { config, ...rest } = decision
  return {
    ...rest,
    config: {
      environment: config.environment,
      orgId: config.orgId,
      eventId: config.eventId,
      enabled: config.enabled,
      capabilities: config.capabilities,
      allowedChipFamilies: config.allowedChipFamilies,
      allowedKeyVersions: config.allowedKeyVersions,
      supportedEntryZones: config.supportedEntryZones,
      manifestValiditySeconds: config.manifestValiditySeconds,
      tapDebounceMs: config.tapDebounceMs,
      outletVerificationRequirement: config.outletVerificationRequirement,
      replacementFeeCents: config.replacementFeeCents,
      replacementFeeWaiverEnabled: config.replacementFeeWaiverEnabled,
      effectiveWithinSeconds: config.effectiveWithinSeconds,
      publicClientConfig: config.publicClientConfig,
      sourceConfigId: config.sourceConfigId,
      updatedAt: config.updatedAt,
    },
  }
}

export function resolveTapBandEnvironment() {
  return normalizeEnvironment(process.env.TAPBAND_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV)
}

function applyFeatureConfigRow(effective: EffectiveTapBandConfig, row: TapBandFeatureConfigRow): EffectiveTapBandConfig {
  const capabilities = { ...effective.capabilities }
  for (const capability of TAPBAND_CAPABILITIES) {
    capabilities[capability] = Boolean(row[CAPABILITY_COLUMN[capability]])
  }

  return {
    environment: normalizeEnvironment(row.environment),
    orgId: row.org_id ?? effective.orgId,
    eventId: row.event_id ?? effective.eventId,
    enabled: row.enabled,
    capabilities,
    allowedChipFamilies: normalizeList(row.allowed_chip_families),
    allowedKeyVersions: normalizeList(row.allowed_key_versions),
    supportedEntryZones: normalizeList(row.supported_entry_zones),
    manifestValiditySeconds: normalizePositiveInteger(row.manifest_validity_seconds, DEFAULT_MANIFEST_VALIDITY_SECONDS),
    tapDebounceMs: normalizeNonNegativeInteger(row.tap_debounce_ms, DEFAULT_TAP_DEBOUNCE_MS),
    outletVerificationRequirement: row.outlet_verification_requirement || "phone_otp",
    replacementFeeCents: normalizeNonNegativeInteger(row.replacement_fee_cents, 0),
    replacementFeeWaiverEnabled: row.replacement_fee_waiver_enabled,
    effectiveWithinSeconds: normalizeNonNegativeInteger(row.effective_within_seconds, DEFAULT_EFFECTIVE_WITHIN_SECONDS),
    publicClientConfig: isPlainObject(row.public_client_config) ? row.public_client_config : {},
    sourceConfigId: row.id ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function featureConfigMatches(
  row: TapBandFeatureConfigRow,
  context: TapBandAccessContext,
  environment: string,
) {
  if (!environmentMatches(row.environment, environment)) return false
  if (row.org_id && row.org_id !== context.orgId) return false
  if (row.event_id && row.event_id !== context.eventId) return false
  return true
}

function featureConfigSpecificity(row: TapBandFeatureConfigRow, environment: string) {
  return (row.environment === environment ? 1 : 0) + (row.org_id ? 2 : 0) + (row.event_id ? 4 : 0)
}

function findMatchingKillSwitch(
  rows: TapBandKillSwitchRow[],
  context: TapBandAccessContext,
  environment: string,
) {
  const now = normalizeDate(context.now)
  return rows
    .filter((row) => killSwitchMatches(row, context, environment, now))
    .sort((a, b) => killSwitchSpecificity(b, environment) - killSwitchSpecificity(a, environment))
    .at(0) ?? null
}

function killSwitchMatches(
  row: TapBandKillSwitchRow,
  context: TapBandAccessContext,
  environment: string,
  now: Date,
) {
  if (!row.enabled) return false
  if (!environmentMatches(row.environment, environment)) return false
  if (row.org_id && row.org_id !== context.orgId) return false
  if (row.event_id && row.event_id !== context.eventId) return false
  if (row.capability && row.capability !== context.capability) return false

  const startsAt = normalizeDate(row.starts_at)
  const endsAt = row.ends_at ? normalizeDate(row.ends_at) : null
  if (startsAt > now) return false
  if (endsAt && endsAt <= now) return false

  switch (row.switch_type) {
    case "all_credential_lookups":
      return !context.capability || CREDENTIAL_LOOKUP_CAPABILITIES.has(context.capability)
    case "supplier_batch":
      return normalizedEquals(row.target_ref, context.supplierBatch)
    case "chip_family":
      return normalizedEquals(row.target_ref, context.chipFamily)
    case "key_version":
      return normalizedEquals(row.target_ref, context.keyVersion)
    case "outlet":
      return normalizedEquals(row.target_ref, context.outletId)
    case "provisioning_device":
      return normalizedEquals(row.target_ref, context.deviceId)
    case "nfc_scanning":
      return context.channel === "nfc" || context.capability === "online_nfc_scanning" || context.capability === "offline_nfc_scanning"
    case "offline_manifest_issuance":
      return context.capability === "offline_manifest_issuance"
    case "customer_replacement":
      return context.capability === "lost_replacement"
    default:
      return false
  }
}

function killSwitchSpecificity(row: TapBandKillSwitchRow, environment: string) {
  return (
    (row.environment === environment ? 1 : 0) +
    (row.org_id ? 2 : 0) +
    (row.event_id ? 4 : 0) +
    (row.target_ref ? 8 : 0) +
    (row.capability ? 16 : 0)
  )
}

function denied(reasonCode: string, reason: string, config: EffectiveTapBandConfig): TapBandAccessDecision {
  return { allowed: false, reasonCode, reason, config, matchedKillSwitch: null }
}

function capabilityForChannel(channel: TapBandAccessContext["channel"]): TapBandCapability | null {
  if (channel === "nfc") return "online_nfc_scanning"
  if (channel === "qr") return "qr_fallback"
  if (channel === "serial") return "credential_lookup"
  return null
}

function environmentMatches(rowEnvironment: string | null | undefined, environment: string) {
  const normalized = normalizeEnvironment(rowEnvironment)
  return normalized === ALL_ENVIRONMENTS || normalized === environment
}

function normalizeEnvironment(environment: string | null | undefined) {
  const normalized = environment?.trim().toLowerCase()
  if (!normalized) return "production"
  if (normalized === "prod") return "production"
  if (normalized === "dev") return "development"
  return normalized
}

function normalizeList(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => entry.trim()).filter(Boolean)
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function normalizeNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

function normalizeDate(value: string | Date | null | undefined) {
  if (value instanceof Date) return value
  const parsed = value ? new Date(value) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function normalizedEquals(a: string | null | undefined, b: string | null | undefined) {
  return a?.trim() === b?.trim() && Boolean(a?.trim())
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
