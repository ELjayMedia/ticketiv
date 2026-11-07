// Chatwoot (self-hosted) Application API: the pure parts, unit tested.
// Network calls live in lib/support/chatwoot.ts.
//
// Configuration (server-only environment variables):
//   CHATWOOT_BASE_URL    e.g. https://chat.example.com   (no trailing path)
//   CHATWOOT_ACCOUNT_ID  the number in the Chatwoot URL: /app/accounts/<id>/…
//   CHATWOOT_API_TOKEN   an agent's access token (Profile settings › Access token)
// The token is sent in the api_access_token header and never reaches the browser.

export interface ChatwootConfig {
  baseUrl: string
  accountId: string
  token: string
}

export type ChatwootConfigResult = { ok: true; config: ChatwootConfig } | { ok: false; missing: string[]; problem?: string }

export function chatwootConfig(env: Record<string, string | undefined>): ChatwootConfigResult {
  const baseUrl = env.CHATWOOT_BASE_URL?.trim()
  const accountId = env.CHATWOOT_ACCOUNT_ID?.trim()
  const token = env.CHATWOOT_API_TOKEN?.trim()
  const missing = [
    !baseUrl && "CHATWOOT_BASE_URL",
    !accountId && "CHATWOOT_ACCOUNT_ID",
    !token && "CHATWOOT_API_TOKEN",
  ].filter(Boolean) as string[]
  if (missing.length) return { ok: false, missing }

  let url: URL
  try {
    url = new URL(baseUrl!)
  } catch {
    return { ok: false, missing: [], problem: "CHATWOOT_BASE_URL is not a valid address." }
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    return { ok: false, missing: [], problem: "CHATWOOT_BASE_URL must use https." }
  }
  if (!/^\d+$/.test(accountId!)) return { ok: false, missing: [], problem: "CHATWOOT_ACCOUNT_ID must be a number." }
  return { ok: true, config: { baseUrl: url.origin, accountId: accountId!, token: token! } }
}

export function chatwootApiUrl(config: ChatwootConfig, path: string, query?: Record<string, string>) {
  const url = new URL(`/api/v1/accounts/${config.accountId}${path}`, config.baseUrl)
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value)
  return url.toString()
}

/** Link that opens a conversation in Chatwoot itself. */
export function chatwootConversationLink(config: Pick<ChatwootConfig, "baseUrl" | "accountId">, conversationId: number) {
  return `${config.baseUrl}/app/accounts/${config.accountId}/conversations/${conversationId}`
}

export interface CaseSummary {
  id: number
  status: string
  contactName: string
  email: string | null
  phone: string | null
  channel: string
  assignee: string | null
  lastMessage: string
  lastActivityAt: string
  unread: number
}

export interface CaseMessage {
  id: number
  from: "customer" | "agent" | "note" | "system"
  author: string
  text: string
  at: string
}

const CHANNEL_NAMES: Record<string, string> = {
  "Channel::Whatsapp": "WhatsApp",
  "Channel::WebWidget": "Web chat",
  "Channel::Email": "Email",
  "Channel::Sms": "SMS",
  "Channel::TwilioSms": "SMS",
  "Channel::FacebookPage": "Facebook",
  "Channel::Instagram": "Instagram",
  "Channel::Telegram": "Telegram",
  "Channel::Api": "API",
}

const unix = (value: unknown) => (typeof value === "number" ? new Date(value * 1000).toISOString() : typeof value === "string" ? value : new Date(0).toISOString())

export function parseConversations(body: unknown): CaseSummary[] {
  const payload = (body as any)?.data?.payload ?? (body as any)?.payload ?? []
  if (!Array.isArray(payload)) return []
  return payload.map((c: any) => {
    const sender = c?.meta?.sender ?? {}
    const last = Array.isArray(c?.messages) && c.messages.length ? c.messages[c.messages.length - 1] : c?.last_non_activity_message
    return {
      id: Number(c.id),
      status: String(c.status ?? "open"),
      contactName: String(sender.name || sender.email || sender.phone_number || "Customer"),
      email: sender.email ? String(sender.email).toLowerCase() : null,
      phone: sender.phone_number ? String(sender.phone_number) : null,
      channel: CHANNEL_NAMES[c?.meta?.channel] ?? (c?.meta?.channel ? String(c.meta.channel).replace("Channel::", "") : "Chat"),
      assignee: c?.meta?.assignee?.name ?? null,
      lastMessage: typeof last?.content === "string" ? last.content.slice(0, 200) : "",
      lastActivityAt: unix(c.last_activity_at ?? c.timestamp),
      unread: Number(c.unread_count ?? 0),
    }
  })
}

export function parseMessages(body: unknown): CaseMessage[] {
  const payload = (body as any)?.payload ?? []
  if (!Array.isArray(payload)) return []
  return payload
    .filter((m: any) => typeof m?.content === "string" && m.content.trim())
    .map((m: any) => {
      // message_type: 0 incoming, 1 outgoing, 2 activity, 3 template
      const from: CaseMessage["from"] = m.private ? "note" : m.message_type === 0 ? "customer" : m.message_type === 2 ? "system" : "agent"
      return {
        id: Number(m.id),
        from,
        author: String(m?.sender?.name ?? (from === "customer" ? "Customer" : "Ticketiv")),
        text: String(m.content),
        at: unix(m.created_at),
      }
    })
    .sort((a: CaseMessage, b: CaseMessage) => a.at.localeCompare(b.at))
}

export function chatwootErrorMessage(status: number): string {
  if (status === 401) return "Chatwoot refused the access token. Check CHATWOOT_API_TOKEN."
  if (status === 404) return "Chatwoot couldn't find that account or conversation. Check CHATWOOT_ACCOUNT_ID."
  if (status === 429) return "Chatwoot is rate limiting us. Try again in a minute."
  return `Chatwoot answered with an error (${status}).`
}
