import { randomBytes } from "node:crypto"

import type { Page } from "@playwright/test"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export const UAT_ORGS = {
  alpha: "da7a0000-0000-4000-8000-000000000001",
  beta: "da7a0000-0000-4000-8000-000000000002",
} as const

export const UAT_PERSONAS = {
  owner: {
    id: "da7a0001-0000-4000-8000-000000000001",
    email: "uat-owner@uat.ticketiv.invalid",
  },
  admin: {
    id: "da7a0001-0000-4000-8000-000000000002",
    email: "uat-admin@uat.ticketiv.invalid",
  },
  finance: {
    id: "da7a0001-0000-4000-8000-000000000003",
    email: "uat-finance@uat.ticketiv.invalid",
  },
  scanner: {
    id: "da7a0001-0000-4000-8000-000000000004",
    email: "uat-scanner@uat.ticketiv.invalid",
  },
  cashier: {
    id: "da7a0001-0000-4000-8000-000000000005",
    email: "uat-cashier@uat.ticketiv.invalid",
  },
  betaOwner: {
    id: "da7a0001-0000-4000-8000-000000000008",
    email: "uat-beta-owner@uat.ticketiv.invalid",
  },
} as const

export type UatPersona = (typeof UAT_PERSONAS)[keyof typeof UAT_PERSONAS]

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

export async function provisionUatPassword(admin: SupabaseClient, persona: UatPersona) {
  // A fresh high-entropy password exists only in this worker's memory. The
  // fixture is torn down after the suite, so no reusable credential is stored
  // in source, CI variables or the shared database beyond the test lifetime.
  const password = `Tiv-${randomBytes(24).toString("base64url")}!9a`
  const { data, error } = await admin.auth.admin.updateUserById(persona.id, {
    password,
    email_confirm: true,
  })

  if (error) throw new Error(`Unable to provision UAT login for ${persona.email}: ${error.message}`)
  if (data.user?.email?.toLowerCase() !== persona.email) {
    throw new Error(`Supabase returned the wrong UAT user while provisioning ${persona.email}.`)
  }

  return password
}

export async function signInUatPersona({
  page,
  email,
  password,
  baseUrl,
  nextPath,
}: {
  page: Page
  email: string
  password: string
  baseUrl: string
  nextPath: string
}) {
  const login = new URL("/login", baseUrl)
  login.searchParams.set("redirectTo", nextPath)

  await page.goto(login.toString(), { waitUntil: "domcontentloaded" })
  await page.getByLabel("Email address *").fill(email)
  await page.getByLabel("Password *").fill(password)
  await page.getByRole("button", { name: /^Log in$/ }).click()
  await page.waitForURL(new URL(nextPath, baseUrl).toString(), { timeout: 30_000 })
}
