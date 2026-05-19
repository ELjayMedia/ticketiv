export class MissingEnvironmentVariableError extends Error {
  readonly variableName: string

  constructor(variableName: string) {
    super(`Missing required environment variable: ${variableName}`)
    this.name = "MissingEnvironmentVariableError"
    this.variableName = variableName
  }
}

export function getRequiredServerEnvVar(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new MissingEnvironmentVariableError(name)
  }

  return value
}

export function getOptionalServerEnvVar(name: string): string | undefined {
  return process.env[name]
}

export function isMissingEnvironmentVariableError(error: unknown): error is MissingEnvironmentVariableError {
  return error instanceof MissingEnvironmentVariableError
}

// Supabase Configuration
// These values must be provided through the deployment environment. Do not
// hardcode fallbacks here: this module is imported by both server and client
// helpers, and public pages should degrade when config is absent instead of
// silently binding to stale credentials.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

export function getSupabaseAdminConfig() {
  const publicConfig = getSupabasePublicConfig()

  if (!publicConfig || !SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  return {
    ...publicConfig,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function getRequiredSupabaseAdminConfig() {
  const publicConfig = getRequiredSupabasePublicConfig()

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new MissingEnvironmentVariableError("SUPABASE_SERVICE_ROLE_KEY")
  }

  return {
    ...publicConfig,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function isSupabaseConfigured() {
  return Boolean(getSupabasePublicConfig())
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseAdminConfig())
}

// App Configuration
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Payment Gateway Configuration
export const DELTAPAY_PUBLIC_KEY = process.env.DELTAPAY_PUBLIC_KEY
export const DELTAPAY_SECRET_KEY = process.env.DELTAPAY_SECRET_KEY
export const DELTAPAY_ENVIRONMENT = (process.env.DELTAPAY_ENVIRONMENT || "dev") as "dev" | "prod"

export const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY
export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY
export const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY

// Third-party Services
export const GOOGLE_MAPS_EMBED_KEY = process.env.GOOGLE_MAPS_EMBED_KEY

// Feature Flags
export const ENABLE_DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true"
export const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true"
