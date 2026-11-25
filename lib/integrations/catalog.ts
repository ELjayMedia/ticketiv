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
  /** Plain-words field label for the console card. */
  label?: string
  /** One line of help under the field. */
  hint?: string
  /**
   * A deployment safety flag (live mode, production money). Shown on the card
   * but only ever set in the Coolify environment, never from the console.
   */
  envOnly?: boolean
}

/**
 * How much of an integration the console can change:
 *   "full"   – on/off switch and every setting (secrets stored encrypted)
 *   "switch" – on/off switch only; keys stay in the Coolify environment
 *              (money providers)
 */
export type ConsoleMode = "full" | "switch"

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
  consoleMode: ConsoleMode
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

type SettingInfo = Pick<IntegrationSetting, "label" | "hint" | "envOnly">
const secret = (name: string, required = true, info: SettingInfo = {}): IntegrationSetting => ({ name, required, secret: true, ...info })
const plain = (name: string, required = true, info: SettingInfo = {}): IntegrationSetting => ({ name, required, secret: false, ...info })

const PAYMENT_SETTINGS: Record<(typeof CHECKOUT_PROVIDERS)[number], readonly IntegrationSetting[]> = {
  paystack: [
    secret("PAYSTACK_SECRET_KEY", true, { label: "Secret key", hint: "Paystack dashboard › Settings › API keys. sk_test_… for testing, sk_live_… for real money." }),
    secret("PAYSTACK_WEBHOOK_SECRET", false, { label: "Webhook secret", hint: "Only if it differs from the secret key. Paystack signs webhooks with the secret key by default." }),
    plain("PAYSTACK_ALLOW_LIVE_MODE", false, { label: "Allow live mode", envOnly: true, hint: "Safety flag: live keys are refused unless this is true in Coolify." }),
  ],
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
      // Paystack keys were already stored in the database (TICK-339); MoMo and
      // DeltaPay keys stay in the environment and only get the switch.
      consoleMode: id === "paystack" ? "full" : "switch",
    }),
  ),
  {
    id: "deltapay_wallet",
    kind: "payouts",
    label: "DeltaPay wallet (EPS)",
    purpose: "Sends organiser payouts to banks and wallets over EPS.",
    consoleMode: "switch",
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
    consoleMode: "full",
    settings: [
      secret("RESEND_API_KEY", true, { label: "API key", hint: "Resend › API Keys. A sending-access key is enough." }),
      plain("RESEND_FROM", false, { label: "From address", hint: "e.g. Ticketiv <tickets@ticketiv.app>. The domain must be verified in Resend." }),
    ],
  },
  {
    id: "twilio",
    kind: "sms",
    label: "Twilio SMS",
    purpose: "Ticket links by SMS for buyers without WhatsApp.",
    selectedBy: { name: "SMS_PROVIDER", value: "twilio" },
    consoleMode: "full",
    settings: [
      plain("TWILIO_ACCOUNT_SID", true, { label: "Account SID", hint: "Twilio Console › Account info. Starts with AC." }),
      secret("SMS_API_KEY", true, { label: "Auth token", hint: "Twilio Console › Account info › Auth token." }),
      plain("SMS_FROM", true, { label: "Sender", hint: "A Twilio number in E.164 (+1…) or an approved alphanumeric sender id." }),
    ],
  },
  {
    id: "africastalking",
    kind: "sms",
    label: "Africa's Talking",
    purpose: "Ticket links by SMS, with SADC coverage.",
    selectedBy: { name: "SMS_PROVIDER", value: "africastalking" },
    consoleMode: "full",
    settings: [
      plain("AT_USERNAME", true, { label: "Username", hint: "Your Africa's Talking app username (\"sandbox\" for testing)." }),
      secret("SMS_API_KEY", true, { label: "API key", hint: "Africa's Talking › Settings › API Key." }),
      plain("SMS_FROM", false, { label: "Sender id", hint: "Optional registered short code or alphanumeric sender id." }),
    ],
  },
  {
    id: "clickatell",
    kind: "sms",
    label: "Clickatell",
    purpose: "Ticket links by SMS.",
    selectedBy: { name: "SMS_PROVIDER", value: "clickatell" },
    consoleMode: "full",
    settings: [secret("SMS_API_KEY", true, { label: "API key", hint: "Clickatell › API integrations › your HTTP/REST integration's API key." })],
  },
  {
    id: "meta_cloud",
    kind: "whatsapp",
    label: "Meta WhatsApp Cloud API",
    purpose: "Ticket links and updates on WhatsApp.",
    selectedBy: { name: "WHATSAPP_PROVIDER", value: "meta_cloud" },
    consoleMode: "full",
    settings: [
      secret("WHATSAPP_API_KEY", true, { label: "Access token", hint: "A permanent System User token from Meta Business settings." }),
      plain("WHATSAPP_PHONE_NUMBER_ID", true, { label: "Phone number ID", hint: "WhatsApp Manager › API setup › Phone number ID (digits)." }),
      plain("WHATSAPP_TEMPLATE", false, { label: "Template name", hint: "Approved template for messages outside the 24-hour window." }),
      plain("WHATSAPP_TEMPLATE_LANG", false, { label: "Template language", hint: "e.g. en or en_US. Defaults to en." }),
    ],
  },
  {
    id: "twilio_whatsapp",
    kind: "whatsapp",
    label: "Twilio WhatsApp",
    purpose: "Ticket links and updates on WhatsApp.",
    selectedBy: { name: "WHATSAPP_PROVIDER", value: "twilio" },
    consoleMode: "full",
    settings: [
      plain("TWILIO_ACCOUNT_SID", true, { label: "Account SID", hint: "Twilio Console › Account info. Starts with AC." }),
      secret("WHATSAPP_API_KEY", true, { label: "Auth token", hint: "Twilio Console › Account info › Auth token." }),
      plain("WHATSAPP_FROM", true, { label: "WhatsApp sender", hint: "Your WhatsApp-enabled Twilio number in E.164, e.g. +14155238886." }),
    ],
  },
  {
    id: "360dialog",
    kind: "whatsapp",
    label: "360dialog",
    purpose: "Ticket links and updates on WhatsApp.",
    selectedBy: { name: "WHATSAPP_PROVIDER", value: "360dialog" },
    consoleMode: "full",
    settings: [
      secret("WHATSAPP_API_KEY", true, { label: "API key", hint: "360dialog Hub › your channel › API key." }),
      plain("WHATSAPP_360_BASE_URL", false, { label: "API address", hint: "Defaults to https://waba-v2.360dialog.io." }),
    ],
  },
  {
    id: "web_push",
    kind: "push",
    label: "Web Push (VAPID)",
    purpose: "Reminders and event updates on devices that opted in.",
    consoleMode: "full",
    settings: [
      plain("NEXT_PUBLIC_VAPID_PUBLIC_KEY", true, { label: "Public key", hint: "Generate a pair with `npx web-push generate-vapid-keys`." }),
      secret("VAPID_PRIVATE_KEY", true, { label: "Private key", hint: "The matching private key. Changing the pair signs out every device from push." }),
    ],
  },
  {
    id: "chatwoot",
    kind: "support",
    label: "Chatwoot",
    purpose: "Support conversations in Cases, matched to people and orders.",
    consoleConfigurable: true,
    consoleMode: "full",
    settings: [
      plain("CHATWOOT_BASE_URL", true, { label: "Chatwoot address", hint: "The address you open Chatwoot at. https only." }),
      plain("CHATWOOT_ACCOUNT_ID", true, { label: "Account ID", hint: "The number after /accounts/ in Chatwoot's address bar." }),
      secret("CHATWOOT_API_TOKEN", true, { label: "Access token", hint: "Profile settings › Access token, from an agent who sees every inbox." }),
    ],
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
