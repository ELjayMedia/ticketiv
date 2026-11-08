// Every outside service Ticketiv talks to, in one list.
//
// Each entry names the provider, what it is for and the settings it needs
// (environment variable names only — never values). The Integrations admin
// page renders this list, and the channel adapters (SMS, WhatsApp) are keyed
// by these ids, so a provider added here without an adapter fails the
// consistency tests in tests/integrations-catalog.test.ts.
//
// Pure data, no server-only imports.

import { CHECKOUT_PROVIDERS } from "@/lib/payments/providers/catalog"

export type IntegrationKind = "payments" | "payouts" | "email" | "sms" | "whatsapp" | "push" | "support"

export interface IntegrationSetting {
  /** Environment variable name. */
  name: string
  required: boolean
  /** Shown with a lock and never echoed anywhere. */
  secret: boolean
}

export interface IntegrationDescriptor {
  id: string
  kind: IntegrationKind
  label: string
  purpose: string
  settings: readonly IntegrationSetting[]
  /**
   * For channels where one provider is chosen at a time: the variable that
   * selects it and the value that selects this provider.
   */
  selectedBy?: { name: string; value: string }
  /** Can also be configured from the console (stored encrypted), not only via env. */
  consoleConfigurable?: boolean
}

export const INTEGRATION_KINDS: ReadonlyArray<{ kind: IntegrationKind; label: string; oneAtATime: boolean }> = [
  { kind: "payments", label: "Payments", oneAtATime: false },
  { kind: "payouts", label: "Organiser payouts", oneAtATime: false },
  { kind: "email", label: "Email", oneAtATime: false },
  { kind: "sms", label: "SMS", oneAtATime: true },
  { kind: "whatsapp", label: "WhatsApp", oneAtATime: true },
  { kind: "push", label: "Push notifications", oneAtATime: false },
  { kind: "support", label: "Support inbox", oneAtATime: false },
]

const secret = (name: string, required = true): IntegrationSetting => ({ name, required, secret: true })
const plain = (name: string, required = true): IntegrationSetting => ({ name, required, secret: false })

const PAYMENT_SETTINGS: Record<(typeof CHECKOUT_PROVIDERS)[number], readonly IntegrationSetting[]> = {
  paystack: [secret("PAYSTACK_SECRET_KEY"), plain("PAYSTACK_ALLOW_LIVE_MODE", false)],
  momo: [
    secret("MOMO_COLLECTIONS_PRIMARY_KEY"),
    plain("MOMO_API_USER"),
    secret("MOMO_API_KEY"),
    plain("MOMO_BASE_URL"),
    plain("MOMO_ENVIRONMENT"),
    plain("MOMO_CALLBACK_URL", false),
  ],
  deltapay: [secret("DELTAPAY_API_KEY"), plain("DELTAPAY_BASE_URL"), plain("DELTAPAY_PRODUCTION_ENABLED", false)],
}

const PAYMENT_LABEL: Record<(typeof CHECKOUT_PROVIDERS)[number], string> = {
  paystack: "Paystack",
  momo: "MTN MoMo",
  deltapay: "DeltaPay",
}

const PAYMENT_PURPOSE: Record<(typeof CHECKOUT_PROVIDERS)[number], string> = {
  paystack: "Card and bank checkout (hosted page).",
  momo: "MTN MoMo checkout: the buyer approves on their phone.",
  deltapay: "DeltaPay hosted checkout in Emalangeni.",
}

export const INTEGRATIONS: readonly IntegrationDescriptor[] = [
  ...CHECKOUT_PROVIDERS.map(
    (id): IntegrationDescriptor => ({
      id,
      kind: "payments",
      label: PAYMENT_LABEL[id],
      purpose: PAYMENT_PURPOSE[id],
      settings: PAYMENT_SETTINGS[id],
    }),
  ),
  {
    id: "deltapay_wallet",
    kind: "payouts",
    label: "DeltaPay wallet (EPS)",
    purpose: "Sends organiser payouts to banks and wallets over EPS.",
    settings: [
      secret("DELTAPAY_API_KEY"),
      plain("DELTAPAY_BASE_URL"),
      plain("DELTAPAY_WALLET_ADDRESS"),
      secret("DELTAPAY_WALLET_PRIVATE_KEY"),
      plain("DELTAPAY_CALLBACK_PUBLIC_KEY"),
      plain("DELTAPAY_PAYOUTS_ENABLED"),
    ],
  },
  {
    id: "resend",
    kind: "email",
    label: "Resend",
    purpose: "Tickets, receipts, reminders and account email.",
    settings: [secret("RESEND_API_KEY"), plain("RESEND_FROM", false)],
  },
  {
    id: "twilio",
    kind: "sms",
    label: "Twilio SMS",
    purpose: "Ticket links by SMS for buyers without WhatsApp.",
    selectedBy: { name: "SMS_PROVIDER", value: "twilio" },
    settings: [secret("SMS_API_KEY"), plain("TWILIO_ACCOUNT_SID"), plain("SMS_FROM")],
  },
  {
    id: "africastalking",
    kind: "sms",
    label: "Africa's Talking",
    purpose: "Ticket links by SMS, with SADC coverage.",
    selectedBy: { name: "SMS_PROVIDER", value: "africastalking" },
    settings: [secret("SMS_API_KEY"), plain("AT_USERNAME"), plain("SMS_FROM", false)],
  },
  {
    id: "clickatell",
    kind: "sms",
    label: "Clickatell",
    purpose: "Ticket links by SMS.",
    selectedBy: { name: "SMS_PROVIDER", value: "clickatell" },
    settings: [secret("SMS_API_KEY")],
  },
  {
    id: "meta_cloud",
    kind: "whatsapp",
    label: "Meta WhatsApp Cloud API",
    purpose: "Ticket links and updates on WhatsApp.",
    selectedBy: { name: "WHATSAPP_PROVIDER", value: "meta_cloud" },
    settings: [
      secret("WHATSAPP_API_KEY"),
      plain("WHATSAPP_PHONE_NUMBER_ID"),
      plain("WHATSAPP_TEMPLATE", false),
      plain("WHATSAPP_TEMPLATE_LANG", false),
    ],
  },
  {
    id: "twilio_whatsapp",
    kind: "whatsapp",
    label: "Twilio WhatsApp",
    purpose: "Ticket links and updates on WhatsApp.",
    selectedBy: { name: "WHATSAPP_PROVIDER", value: "twilio" },
    settings: [secret("WHATSAPP_API_KEY"), plain("TWILIO_ACCOUNT_SID"), plain("WHATSAPP_FROM")],
  },
  {
    id: "360dialog",
    kind: "whatsapp",
    label: "360dialog",
    purpose: "Ticket links and updates on WhatsApp.",
    selectedBy: { name: "WHATSAPP_PROVIDER", value: "360dialog" },
    settings: [secret("WHATSAPP_API_KEY"), plain("WHATSAPP_360_BASE_URL", false)],
  },
  {
    id: "web_push",
    kind: "push",
    label: "Web Push (VAPID)",
    purpose: "Reminders and event updates on devices that opted in.",
    settings: [plain("NEXT_PUBLIC_VAPID_PUBLIC_KEY"), secret("VAPID_PRIVATE_KEY")],
  },
  {
    id: "chatwoot",
    kind: "support",
    label: "Chatwoot",
    purpose: "Support conversations in Cases, matched to people and orders.",
    consoleConfigurable: true,
    settings: [plain("CHATWOOT_BASE_URL"), plain("CHATWOOT_ACCOUNT_ID"), secret("CHATWOOT_API_TOKEN")],
  },
]

export function integrationsOfKind(kind: IntegrationKind): IntegrationDescriptor[] {
  return INTEGRATIONS.filter((integration) => integration.kind === kind)
}

/** The provider ids a one-at-a-time channel (SMS, WhatsApp) can be switched to, by selector value. */
export function selectorValues(kind: IntegrationKind): string[] {
  return integrationsOfKind(kind)
    .map((integration) => integration.selectedBy?.value)
    .filter((value): value is string => Boolean(value))
}

export type EnvSnapshot = Record<string, string | undefined>

export interface EnvStatus {
  /** Required settings that are empty. Names only. */
  missing: string[]
  /** For one-at-a-time channels: whether the selector currently points at this provider. */
  selected: boolean
  /** Every required setting is present (and, where relevant, this provider is selected). */
  configured: boolean
}

/** Configuration state from environment variable presence. Never reads or returns values. */
export function envStatus(integration: IntegrationDescriptor, env: EnvSnapshot): EnvStatus {
  const has = (name: string) => Boolean(env[name]?.trim())
  const missing = integration.settings.filter((s) => s.required && !has(s.name)).map((s) => s.name)
  const selected = integration.selectedBy ? env[integration.selectedBy.name]?.trim() === integration.selectedBy.value : true
  return { missing, selected, configured: selected && missing.length === 0 }
}
