import type { Page } from "@playwright/test"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export const UAT_ORGS = {
  alpha: "da7a0000-0000-4000-8000-000000000001",
  beta: "da7a0000-0000-4000-8000-000000000002",
} as const

export const UAT_PERSONAS = {
  owner: "uat-owner@uat.ticketiv.invalid",
  admin: "uat-admin@uat.ticketiv.invalid",
  finance: "uat-finance@uat.ticketiv.invalid",
  scanner: "uat-scanner@uat.ticketiv.invalid",
  cashier: "uat-cashier@uat.ticketiv.invalid",
  betaOwner: "uat-beta-owner@uat.ticketiv.invalid",
} as const

const REQUIRED_ENV = [
  "PLAYWRIGHT_BASE_URL",
  "TEST_SUPABASE_URL",
  "TEST_SUPABASE_SERVICE_ROLE_KEY",
  "TEST_SUPABASE_ALLOW_PROJECT_REF",
] as const

export interface AuthenticatedUatConfig {
  ready: boolean
  missing: string[]
  sharedEnvironmentAcknowledged: boolean
  projectRefMatches: boolean
  baseUrl: string | null
  supabaseUrl: string | null
  serviceKey: string | null
  allowedProjectRef: string | null
}

function projectRef(url: string | undefined): string | null {
  return url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null
}

export function readAuthenticatedUatConfig(): AuthenticatedUatConfig {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim())
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim() || null
  const supabaseUrl = process.env.TEST_SUPABASE_URL?.trim() || null
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY?.trim() || null
  const allowedProjectRef = process.env.TEST_SUPABASE_ALLOW_PROJECT_REF?.trim() || null
  const sharedEnvironmentAcknowledged = process.env.E2E_ALLOW_SHARED_UAT === "1"
  const actualProjectRef = projectRef(supabaseUrl ?? undefined)
  const projectRefMatches = Boolean(actualProjectRef && allowedProjectRef && actualProjectRef === allowedProjectRef)

  return {
    ready:
      process.env.E2E_STRICT === "1" &&
      missing.length === 0 &&
      sharedEnvironmentAcknowledged &&
      projectRefMatches,
    missing,
    sharedEnvironmentAcknowledged,
    projectRefMatches,
    baseUrl,
    supabaseUrl,
    serviceKey,
    allowedProjectRef,
  }
}

export function createUatAdmin(config: AuthenticatedUatConfig): SupabaseClient {
  if (!config.ready || !config.supabaseUrl || !config.serviceKey) {
    throw new Error("Authenticated UAT is not safely configured.")
  }

  return createClient(config.supabaseUrl, config.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function seedUatFixtures(admin: SupabaseClient) {
  const { data, error } = await admin.rpc("fn_seed_uat_fixtures")
  if (error) throw new Error(`fn_seed_uat_fixtures failed: ${error.message}`)

  const seeded = data as { ok?: boolean; currency?: string } | null
  if (!seeded?.ok || seeded.currency !== "ZAR") {
    throw new Error("UAT seed returned an unexpected fixture contract.")
  }
}

export async function teardownUatFixtures(admin: SupabaseClient) {
  const { error } = await admin.rpc("fn_teardown_uat_fixtures")
  if (error) throw new Error(`fn_teardown_uat_fixtures failed: ${error.message}`)
}

export async function signInUatPersona({
  admin,
  page,
  email,
  baseUrl,
  nextPath,
}: {
  admin: SupabaseClient
  page: Page
  email: string
  baseUrl: string
  nextPath: string
}) {
  const redirectTo = new URL(`/auth/callback?next=${encodeURIComponent(nextPath)}`, baseUrl).toString()
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  })

  if (error) throw new Error(`Unable to generate UAT auth link for ${email}: ${error.message}`)

  const actionLink = data.properties?.action_link
  const actualRedirect = data.properties?.redirect_to
  if (!actionLink) throw new Error(`Supabase did not return an auth action link for ${email}.`)

  if (!actualRedirect || new URL(actualRedirect).toString() !== new URL(redirectTo).toString()) {
    throw new Error(
      "Supabase rejected the requested E2E redirect URL. Add the deployed test target to the Auth redirect allow-list before running authenticated E2E.",
    )
  }

  // The generated action link is a one-time credential. Keep it only in memory,
  // never print it, and let the existing /auth/callback exchange it for the
  // normal Ticketiv SSR session cookies.
  await page.goto(actionLink, { waitUntil: "domcontentloaded" })
  await page.waitForURL(new URL(nextPath, baseUrl).toString(), { timeout: 30_000 })
}
