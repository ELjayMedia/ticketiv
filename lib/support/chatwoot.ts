import "server-only"

import { cache } from "react"

import { decryptPayoutDetails } from "@/lib/payout-crypto-core"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  chatwootApiUrl,
  chatwootConfig,
  chatwootErrorMessage,
  parseConversations,
  parseMessages,
  type CaseMessage,
  type CaseSummary,
  type ChatwootConfig,
  type ChatwootConfigResult,
} from "@/lib/support/chatwoot-core"

export type ChatwootResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface StoredChatwootSettings {
  baseUrl: string | null
  accountId: string | null
  tokenEncrypted: string | null
  tokenHint: string | null
  updatedBy: string | null
  updatedAt: string | null
}

/** The connection saved from Integrations, if any. Never leaves the server with its token. */
export async function loadStoredChatwootSettings(): Promise<StoredChatwootSettings | null> {
  const db = createAdminClient() as unknown as { from: (table: string) => any }
  const { data, error } = await db
    .from("admin_integration_settings")
    .select("base_url, account_id, token_encrypted, token_hint, updated_by, updated_at")
    .eq("provider", "chatwoot")
    .maybeSingle()
  // Before the migration runs the table doesn't exist: fall back to environment variables.
  if (error || !data) return null
  return {
    baseUrl: data.base_url,
    accountId: data.account_id,
    tokenEncrypted: data.token_encrypted,
    tokenHint: data.token_hint,
    updatedBy: data.updated_by,
    updatedAt: data.updated_at,
  }
}

/** Decrypts a stored token. Null when there is none or it can no longer be read. */
export function decryptChatwootToken(stored: string | null): string | null {
  if (!stored) return null
  try {
    const token = decryptPayoutDetails(stored)?.token
    return typeof token === "string" && token ? token : null
  } catch {
    return null
  }
}

export type ChatwootConfigSource = "console" | "environment"

/**
 * Settings saved in the console win over CHATWOOT_* environment variables, so
 * the owner can connect or change Chatwoot without a redeploy.
 */
export const getChatwootConfig = cache(async (): Promise<ChatwootConfigResult & { source: ChatwootConfigSource }> => {
  const stored = await loadStoredChatwootSettings()
  if (stored && (stored.baseUrl || stored.accountId || stored.tokenEncrypted)) {
    const token = decryptChatwootToken(stored.tokenEncrypted)
    if (stored.tokenEncrypted && !token) {
      return { ok: false, missing: [], problem: "The saved Chatwoot token can't be read (the encryption key changed). Save it again in Integrations.", source: "console" }
    }
    return {
      ...chatwootConfig({
        CHATWOOT_BASE_URL: stored.baseUrl ?? undefined,
        CHATWOOT_ACCOUNT_ID: stored.accountId ?? undefined,
        CHATWOOT_API_TOKEN: token ?? undefined,
      }),
      source: "console",
    }
  }
  return { ...chatwootConfig(process.env), source: "environment" }
})

/** Checks the address, account and token with one light read (the account's inboxes). */
export async function testChatwootConnection(config: ChatwootConfig): Promise<ChatwootResult<{ inboxes: number }>> {
  try {
    const res = await call(config, "/inboxes")
    if (!res.ok) return res
    const payload = (res.body as any)?.payload
    return { ok: true, data: { inboxes: Array.isArray(payload) ? payload.length : 0 } }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError"
    return { ok: false, error: timedOut ? "Chatwoot didn't answer within 10 seconds. Check the address." : "Couldn't reach Chatwoot at that address." }
  }
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
  const cfg = await getChatwootConfig()
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
