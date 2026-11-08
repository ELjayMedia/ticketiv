import "server-only"

import type { Tone } from "@/components/super-admin/console-ui"
import { envStatus, INTEGRATIONS, type EnvSnapshot, type IntegrationDescriptor } from "@/lib/integrations/catalog"
import { getOrganizerPaymentProviderOptions } from "@/lib/payments/availability"
import { getDeltaPayWalletConfig } from "@/lib/payments/deltapay-wallet"
import { isCheckoutProvider } from "@/lib/payments/providers/catalog"
import { getProviderProductionReadiness } from "@/lib/payments/provider-readiness"
import { getChatwootConfig } from "@/lib/support/chatwoot"

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
  /** Payments only: the production-readiness gate (TICK-400). */
  readiness?: { badge: string; tone: Tone; detail: string }
}

function base(integration: IntegrationDescriptor) {
  return {
    id: integration.id,
    kind: integration.kind,
    label: integration.label,
    purpose: integration.purpose,
    settings: integration.settings,
    selectedBy: integration.selectedBy,
    consoleConfigurable: Boolean(integration.consoleConfigurable),
  }
}

/** Pure: badge and summary from environment presence alone (email, SMS, WhatsApp, push). */
export function channelStatus(integration: IntegrationDescriptor, env: EnvSnapshot): IntegrationStatus {
  const state = envStatus(integration, env)
  if (integration.selectedBy && !state.selected) {
    return {
      ...base(integration),
      badge: "Not selected",
      tone: "muted",
      summary: `Set ${integration.selectedBy.name}=${integration.selectedBy.value} to use this provider.`,
      // Not in use, so its unset settings aren't a problem worth highlighting.
      missing: [],
    }
  }
  if (state.missing.length > 0) {
    return {
      ...base(integration),
      badge: integration.selectedBy ? "Incomplete" : "Not configured",
      tone: "warning",
      summary: `Missing ${state.missing.join(", ")}. Messages on this channel are skipped until it is set.`,
      missing: state.missing,
    }
  }
  return { ...base(integration), badge: "Active", tone: "success", summary: "Configured and in use.", missing: [] }
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
      ...base(integration),
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
    ...base(integration),
    badge,
    tone,
    summary: option.warning ?? "Offered at checkout where the event allows it.",
    missing: shownMissing,
    readiness,
  }
}

function payoutStatus(integration: IntegrationDescriptor, env: EnvSnapshot): IntegrationStatus {
  const { missing } = envStatus(integration, env)
  const config = getDeltaPayWalletConfig()
  return config.operational
    ? { ...base(integration), badge: "Active", tone: "success", summary: "Payouts can be sent from the payouts queue.", missing: [] }
    : {
        ...base(integration),
        badge: "Off",
        tone: missing.length ? "warning" : "muted",
        summary: config.problems.join(" ") || "Payouts over DeltaPay are switched off.",
        missing,
      }
}

async function supportStatus(integration: IntegrationDescriptor): Promise<IntegrationStatus> {
  const config = await getChatwootConfig()
  if (config.ok) {
    return {
      ...base(integration),
      badge: "Active",
      tone: "success",
      summary: config.source === "console" ? "Connected from this console." : "Connected through the CHATWOOT_* environment variables.",
      missing: [],
    }
  }
  return {
    ...base(integration),
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

  return Promise.all(
    INTEGRATIONS.map((integration) => {
      switch (integration.kind) {
        case "payments":
          return paymentStatus(integration, env, options)
        case "payouts":
          return payoutStatus(integration, env)
        case "support":
          return supportStatus(integration)
        default:
          return channelStatus(integration, env)
      }
    }),
  )
}
