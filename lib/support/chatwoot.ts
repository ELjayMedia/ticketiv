import "server-only"

import {
  chatwootApiUrl,
  chatwootConfig,
  chatwootErrorMessage,
  parseConversations,
  parseMessages,
  type CaseMessage,
  type CaseSummary,
  type ChatwootConfig,
} from "@/lib/support/chatwoot-core"

export type ChatwootResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function getChatwootConfig() {
  return chatwootConfig(process.env)
}

async function call(config: ChatwootConfig, path: string, init: { method?: "GET" | "POST"; query?: Record<string, string>; body?: unknown } = {}) {
  const response = await fetch(chatwootApiUrl(config, path, init.query), {
    method: init.method ?? "GET",
    headers: { api_access_token: config.token, "content-type": "application/json", accept: "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) return { ok: false as const, error: chatwootErrorMessage(response.status) }
  return { ok: true as const, body: await response.json().catch(() => ({})) }
}

async function guarded<T>(run: (config: ChatwootConfig) => Promise<ChatwootResult<T>>): Promise<ChatwootResult<T>> {
  const cfg = getChatwootConfig()
  if (!cfg.ok) return { ok: false, error: cfg.problem ?? `Chatwoot isn't connected yet (missing ${cfg.missing.join(", ")}).` }
  try {
    return await run(cfg.config)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError"
    return { ok: false, error: timedOut ? "Chatwoot didn't answer within 10 seconds." : "Couldn't reach Chatwoot." }
  }
}

export function listCases(status: "open" | "pending" | "resolved" = "open"): Promise<ChatwootResult<CaseSummary[]>> {
  return guarded(async (config) => {
    const res = await call(config, "/conversations", { query: { status, assignee_type: "all", page: "1" } })
    return res.ok ? { ok: true, data: parseConversations(res.body) } : res
  })
}

export function getCase(conversationId: number): Promise<ChatwootResult<{ summary: CaseSummary | null; messages: CaseMessage[] }>> {
  return guarded(async (config) => {
    const [conversation, messages] = await Promise.all([
      call(config, `/conversations/${conversationId}`),
      call(config, `/conversations/${conversationId}/messages`),
    ])
    if (!conversation.ok) return conversation
    if (!messages.ok) return messages
    const [summary] = parseConversations({ payload: [conversation.body] })
    return { ok: true, data: { summary: summary ?? null, messages: parseMessages(messages.body) } }
  })
}

/** Reply to the customer (private: false) or leave an internal note in Chatwoot (private: true). */
export function sendCaseMessage(conversationId: number, content: string, isPrivate = false): Promise<ChatwootResult<true>> {
  return guarded(async (config) => {
    const res = await call(config, `/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content, message_type: "outgoing", private: isPrivate },
    })
    return res.ok ? { ok: true, data: true } : res
  })
}

export function resolveCase(conversationId: number): Promise<ChatwootResult<true>> {
  return guarded(async (config) => {
    const res = await call(config, `/conversations/${conversationId}/toggle_status`, { method: "POST", body: { status: "resolved" } })
    return res.ok ? { ok: true, data: true } : res
  })
}
