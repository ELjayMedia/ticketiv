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

// Browser-safe Supabase configuration. Only NEXT_PUBLIC_* values live here.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabasePublicConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  }
}

export function getRequiredSupabasePublicConfig() {
  const config = getSupabasePublicConfig()

  if (!config) {
    throw new MissingEnvironmentVariableError(
      !SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }

  return config
}

export function isSupabaseConfigured() {
  return Boolean(getSupabasePublicConfig())
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const ENABLE_DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true"
export const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true"
