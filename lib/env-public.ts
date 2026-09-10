import { getTicketivPublicOrigin } from "@/lib/public-url"

export class MissingEnvironmentVariableError extends Error {
  readonly variableName: string

  constructor(variableName: string) {
    super(`Missing required environment variable: ${variableName}`)
    this.name = "MissingEnvironmentVariableError"
    this.variableName = variableName
  }
}

export function isMissingEnvironmentVariableError(error: unknown): error is MissingEnvironmentVariableError {
  return error instanceof MissingEnvironmentVariableError
}

// Browser-safe Supabase configuration. Only public credentials live here.
//
// Supabase disabled Ticketiv's legacy anon JWT on 9 Sep 2026 as part of the
// credential rotation. Prefer the modern sb_publishable_ key everywhere. The
// fallback below is intentionally safe to ship to browsers: publishable keys
// are public client credentials, not backend secrets. Keeping it here also
// prevents an old NEXT_PUBLIC_SUPABASE_ANON_KEY value from taking production
// down while Vercel/GitHub environments are migrated to the new variable name.
const TICKETIV_SUPABASE_URL = "https://radsfmlsjznqvcpogluo.supabase.co"
const TICKETIV_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_FzIaYAJ3S2rjdgV-GCqeBQ_s1jOxtGb"

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export const SUPABASE_LEGACY_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function resolveSupabasePublicKey(
  url: string | undefined,
  publishableKey: string | undefined,
  legacyAnonKey: string | undefined,
) {
  if (publishableKey?.trim()) return publishableKey.trim()

  // Ticketiv's legacy anon JWT is disabled. Use the active project publishable
  // credential even while old deployment environments still expose the legacy
  // env name/value. Other Supabase projects retain backward compatibility.
  if (url === TICKETIV_SUPABASE_URL) return TICKETIV_SUPABASE_PUBLISHABLE_KEY

  return legacyAnonKey?.trim() || undefined
}

export const SUPABASE_PUBLIC_KEY = resolveSupabasePublicKey(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_LEGACY_ANON_KEY,
)

// Compatibility alias for code that still refers to the public credential as
// an "anon key". The value may now be an sb_publishable_ key.
export const SUPABASE_ANON_KEY = SUPABASE_PUBLIC_KEY

export function getSupabasePublicConfig() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    return null
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_PUBLIC_KEY,
  }
}

export function getRequiredSupabasePublicConfig() {
  const config = getSupabasePublicConfig()

  if (!config) {
    throw new MissingEnvironmentVariableError(
      !SUPABASE_URL
        ? "NEXT_PUBLIC_SUPABASE_URL"
        : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }

  return config
}

export function isSupabaseConfigured() {
  return Boolean(getSupabasePublicConfig())
}

// Normalized on main: canonicalizes bare hosts / legacy ticketiv.com and falls
// back to the public origin, rather than trusting NEXT_PUBLIC_APP_URL verbatim.
// public-url.ts is dependency-free and browser-safe, so it is fine to reach from
// this client-importable module.
export const APP_URL = getTicketivPublicOrigin()

export const ENABLE_DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true"
export const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true"
