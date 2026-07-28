import {
  getRequiredSupabasePublicConfig,
  getSupabasePublicConfig,
  MissingEnvironmentVariableError,
} from "./env-public"

export {
  APP_URL,
  ENABLE_ANALYTICS,
  ENABLE_DEMO_MODE,
  getRequiredSupabasePublicConfig,
  getSupabasePublicConfig,
  isMissingEnvironmentVariableError,
  isSupabaseConfigured,
  MissingEnvironmentVariableError,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./env-public"

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

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseAdminConfig())
}

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
