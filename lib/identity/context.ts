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

/** Where the attendee ("Personal") side starts after login. */
export const PERSONAL_LANDING = "/"

/**
 * Smart landing after login (`/launch`):
 *   - returning user with a still-valid last context → that context
 *     (Personal lands on Discover, not the profile page)
 *   - belongs to an organisation → that organisation's dashboard
 *   - only a Door/Scan role beyond Personal → Scan
 *   - otherwise (attendees, first-ever login) → Discover
 */
export function pickLanding(contexts: UserContext[], lastKey: string | null): string {
  const hrefFor = (c: UserContext) => (c.kind === "personal" ? PERSONAL_LANDING : c.href)
  if (contexts.length === 0) return PERSONAL_LANDING

  if (lastKey) {
    const last = contexts.find((c) => c.key === lastKey)
    if (last) return hrefFor(last)
  }

  const org = contexts.find((c) => c.kind === "org")
  if (org) return org.href

  const nonPersonal = contexts.filter((c) => c.kind !== "personal")
  if (nonPersonal.length === 1 && nonPersonal[0].kind === "scan") {
    return nonPersonal[0].href
  }

  return PERSONAL_LANDING
}
