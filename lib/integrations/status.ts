import "server-only"

import type { Tone } from "@/components/super-admin/console-ui"
import { envStatus, INTEGRATIONS, type EnvSnapshot, type IntegrationDescriptor } from "@/lib/integrations/catalog"
import { getOrganizerPaymentProviderOptions } from "@/lib/payments/availability"
import { getDeltaPayWalletConfig } from "@/lib/payments/deltapay-wallet"
import { isCheckoutProvider } from "@/lib/payments/providers/catalog"
import { getProviderProductionReadiness } from "@/lib/payments/provider-readiness"
import { getChatwootConfig } from "@/lib/support/chatwoot"
import { deltaPayPayoutsAvailable } from "@/lib/payouts/deltapay-payouts"
import {
  decryptIntegrationSecrets,
  layerIntegrationEnv,
  loadIntegrationConfigs,
  pickChannelProvider,
  type IntegrationSource,
  type StoredIntegrationConfig,
} from "@/lib/integrations/runtime"

/**
 * The state of every integration, for the admin console. Built from the same
 * checks the app uses at run time (payment availability, the readiness gate,
 * the DeltaPay wallet and Chatwoot config) plus environment-variable presence
 * for the channels. Reports setting NAMES only; no value ever leaves here.
 */

export interface IntegrationStatus {
  id: string
  kind: IntegrationDescriptor["kind"]
  label: string
  purpose: string
  /** One-word state for the badge. */
  badge: string
  tone: Tone
  /** One plain sentence explaining the state. */
  summary: string
  /** Required settings that are empty. */
  missing: string[]
  settings: IntegrationDescriptor["settings"]
  selectedBy?: IntegrationDescriptor["selectedBy"]
  consoleConfigurable: boolean
  consoleMode: IntegrationDescriptor["consoleMode"]
  /** The card's on/off switch as the app sees it right now. */
  switchedOn: boolean
  /** Where its settings come from. */
  source: IntegrationSource
  /** Payments only: the production-readiness gate (TICK-400). */
  readiness?: { badge: string; tone: Tone; detail: string }
}

function base(integration: IntegrationDescriptor, switchedOn = false, source: IntegrationSource = "environment") {
  return {
    id: integration.id,
    kind: integration.kind,
    label: integration.label,
    purpose: integration.purpose,
    settings: integration.settings,
    selectedBy: integration.selectedBy,
    consoleConfigurable: Boolean(integration.consoleConfigurable || integration.consoleMode === "full"),
    consoleMode: integration.consoleMode,
    switchedOn,
    source,
  }
}

/** Pure: badge and summary from environment presence alone (email, SMS, WhatsApp, push). */
export function channelStatus(integration: IntegrationDescriptor, env: EnvSnapshot, source: IntegrationSource = "environment"): IntegrationStatus {
  if (source === "off") {
    return { ...base(integration, false, "off"), badge: "Off", tone: "muted", summary: "Switched off. Nothing is sent on this channel through this provider.", missing: [] }
  }
  const state = envStatus(integration, env)
  if (integration.selectedBy && !state.selected) {
    return {
      ...base(integration, false, source),
      badge: "Not selected",
      tone: "muted",
      summary: `Not in use. Switch it on to use it instead of the current ${integration.kind === "sms" ? "SMS" : "WhatsApp"} provider (or set ${integration.selectedBy.name}=${integration.selectedBy.value} in Coolify).`,
      // Not in use, so its unset settings aren't a problem worth highlighting.
      missing: [],
    }
  }
  if (state.missing.length > 0) {
    return {
      ...base(integration, true, source),
      badge: integration.selectedBy ? "Incomplete" : "Not configured",
      tone: "warning",
      summary: `Missing ${state.missing.join(", ")}. Messages on this channel are skipped until it is set.`,
      missing: state.missing,
    }
  }
  return {
    ...base(integration, true, source),
    badge: "Active",
    tone: "success",
    summary: source === "console" ? "Configured here and in use." : "Configured through the Coolify environment and in use.",
    missing: [],
  }
}

async function paymentStatus(
  integration: IntegrationDescriptor,
  env: EnvSnapshot,
  options: Awaited<ReturnType<typeof getOrganizerPaymentProviderOptions>> | null,
): Promise<IntegrationStatus> {
  const { missing } = envStatus(integration, env)
  const option = options?.find((o) => o.id === integration.id)

  let readiness: IntegrationStatus["readiness"]
  if (isCheckoutProvider(integration.id)) {
    try {
      const state = await getProviderProductionReadiness(integration.id)
      readiness = state.blockedAt
        ? { badge: "Blocked", tone: "danger", detail: state.blockedReason ?? "Blocked by an admin." }
        : state.productionReady
          ? { badge: "Live approved", tone: "success", detail: state.approvedAt ? `Approved ${state.approvedAt.slice(0, 10)}.` : "Approved for real money." }
          : { badge: "Not approved", tone: "warning", detail: "Not yet approved for real-money payments." }
    } catch {
      readiness = { badge: "Unknown", tone: "muted", detail: "The readiness record couldn't be read." }
    }
  }

  if (!option) {
    return {
      ...base(integration, false),
      badge: "Unknown",
      tone: "muted",
      summary: "Payment availability couldn't be checked.",
      missing,
      readiness,
    }
  }
  // Paystack keys can also come from the encrypted settings table, so an empty
  // env var is only worth showing while the provider isn't working.
  const shownMissing = option.operational ? [] : missing
  const badge = option.operational ? "Active" : option.enabled ? "Incomplete" : "Off"
  const tone: Tone = option.operational ? "success" : option.enabled ? "warning" : "muted"
  return {
    ...base(integration, option.enabled, integration.consoleMode === "full" ? "console" : "environment"),
    badge,
    tone,
    summary: option.warning ?? "Offered at checkout where the event allows it.",
    missing: shownMissing,
    readiness,
  }
}

async function payoutStatus(integration: IntegrationDescriptor, env: EnvSnapshot, row: StoredIntegrationConfig | null): Promise<IntegrationStatus> {
  const { missing } = envStatus(integration, env)
  const config = getDeltaPayWalletConfig()
  if (row?.enabled === false) {
    return { ...base(integration, false, "off"), badge: "Off", tone: "muted", summary: "Switched off here. No payouts are sent over DeltaPay.", missing: [] }
  }
  return (await deltaPayPayoutsAvailable())
    ? { ...base(integration, true), badge: "Active", tone: "success", summary: "Payouts can be sent from the payouts queue.", missing: [] }
    : {
        ...base(integration, true),
        badge: "Off",
        tone: missing.length ? "warning" : "muted",
        summary: config.problems.join(" ") || "Payouts over DeltaPay are switched off.",
        missing,
      }
}

async function supportStatus(integration: IntegrationDescriptor): Promise<IntegrationStatus> {
  const config = await getChatwootConfig()
  if (config.source === "off") {
    return { ...base(integration, false, "off"), badge: "Off", tone: "muted", summary: "Switched off. Cases doesn't load conversations.", missing: [] }
  }
  if (config.ok) {
    return {
      ...base(integration, true, config.source),
      badge: "Active",
      tone: "success",
      summary: config.source === "console" ? "Connected from this console." : "Connected through the CHATWOOT_* environment variables.",
      missing: [],
    }
  }
  return {
    ...base(integration, false, config.source),
    badge: "Not connected",
    tone: "warning",
    summary: config.problem ?? `Missing ${config.missing.join(", ")}. Connect it below.`,
    missing: config.missing,
  }
}

export async function getIntegrationStatuses(env: EnvSnapshot = process.env): Promise<IntegrationStatus[]> {
  const options = await getOrganizerPaymentProviderOptions().catch((error) => {
    console.error("[integrations] payment availability", error)
    return null
  })

  const rows = await loadIntegrationConfigs()

  return Promise.all(
    INTEGRATIONS.map((integration) => {
      const row = rows.get(integration.id) ?? null
      switch (integration.kind) {
        case "payments":
          return paymentStatus(integration, env, options)
        case "payouts":
          return payoutStatus(integration, env, row)
        case "support":
          return supportStatus(integration)
        default: {
          const secrets = row?.enabled ? decryptIntegrationSecrets(row.secretsEncrypted) : {}
          const resolved = layerIntegrationEnv(integration, row, secrets, env)
          if (integration.selectedBy && resolved.source !== "off") {
            // Selection follows the runtime rule: a switched-on card wins over the env selector.
            const active = pickChannelProvider(integration.kind, rows, env)
            const selectedEnv = { ...resolved.env, [integration.selectedBy.name]: active?.id === integration.id ? integration.selectedBy.value : "" }
            return channelStatus(integration, selectedEnv, resolved.source)
          }
          return channelStatus(integration, resolved.env, resolved.source)
        }
      }
    }),
  )
}
