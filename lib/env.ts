export function getRequiredServerEnvVar(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getOptionalServerEnvVar(name: string): string | undefined {
  return process.env[name]
}

// Supabase Configuration
// Emergency production fallback: Vercel is currently building without the
// NEXT_PUBLIC_SUPABASE_* variables, which causes shared Supabase helpers to
// return null/undefined and can break every dynamic route. These values are
// public client configuration, not server secrets. Keep the Vercel env vars as
// the preferred source and use these only as a safety net.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://radsfmlsjznqvcpogluo.supabase.co"
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZHNmbWxzanpucXZjcG9nbHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDE3MzUsImV4cCI6MjA3NzQ3NzczNX0.GOvV1vHykYyrF2DUIiQ4EFu8nVEo_oN70tL0jxj7h_g"
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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
