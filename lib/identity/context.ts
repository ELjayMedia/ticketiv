// Active-context persistence + smart-landing rules for the context switcher
// (TICK-275). The active context is remembered in a cookie so returning users
// land where they left off.

import "server-only"
import { cookies } from "next/headers"
import type { UserContext } from "@/lib/data/identity/contexts"

export const CONTEXT_COOKIE = "tk_ctx"

export async function getActiveContextKey(): Promise<string | null> {
  const store = await cookies()
  return store.get(CONTEXT_COOKIE)?.value ?? null
}

/**
 * Smart landing:
 *   - returning user with a still-valid last context → that context
 *   - only a Door/Scan role beyond Personal → Scan
 *   - otherwise (incl. first-ever login) → Personal
 */
export function pickLanding(contexts: UserContext[], lastKey: string | null): string {
  if (contexts.length === 0) return "/me"

  if (lastKey) {
    const last = contexts.find((c) => c.key === lastKey)
    if (last) return last.href
  }

  const nonPersonal = contexts.filter((c) => c.kind !== "personal")
  if (nonPersonal.length === 1 && nonPersonal[0].kind === "scan") {
    return nonPersonal[0].href
  }

  return contexts.find((c) => c.kind === "personal")?.href ?? contexts[0].href
}
