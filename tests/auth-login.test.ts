import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  landingForSession: vi.fn(),
  origin: "https://ticketiv.app" as string | null,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, signUp: mocks.signUp, getUser: mocks.getUser },
    rpc: mocks.rpc,
  }),
}))
vi.mock("@/lib/auth/landing", () => ({ landingForSession: mocks.landingForSession }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers(mocks.origin ? { origin: mocks.origin } : {}),
}))

import { loginAction, signupAction } from "@/app/(auth)/actions"
import { INITIAL_AUTH_STATE } from "@/lib/auth/form-state"
import { requestedNext, safeNext } from "@/lib/auth/redirect"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(values)) data.set(k, v)
  return data
}

const session = { access_token: "at", refresh_token: "rt" }
const user = { id: "u1", email: "ada@example.com" }

describe("safe redirects", () => {
  it("only accepts same-site paths", () => {
    expect(safeNext("/orgs/1")).toBe("/orgs/1")
    expect(safeNext("/tickets?tab=past")).toBe("/tickets?tab=past")
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "orgs", "", null, 42]) {
      expect(safeNext(bad), String(bad)).toBeNull()
    }
  })

  it("reads redirectTo, then from, then next", () => {
    const params = (o: Record<string, string>) => new URLSearchParams(o)
    expect(requestedNext(params({ from: "/orgs", next: "/me" }))).toBe("/orgs")
    expect(requestedNext(params({ redirectTo: "//x", from: "/orgs" }))).toBe("/orgs")
    expect(requestedNext(params({}))).toBeNull()
  })
})

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.landingForSession.mockResolvedValue("/orgs/org-1")
  })

  it("validates before calling Supabase", async () => {
    expect(await loginAction(INITIAL_AUTH_STATE, form({ email: "nope", password: "x" }))).toMatchObject({ status: "error" })
    expect(await loginAction(INITIAL_AUTH_STATE, form({ email: "a@b.co", password: "" }))).toMatchObject({
      status: "error",
      message: "Enter your password.",
      values: { email: "a@b.co" },
    })
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it("explains wrong credentials and keeps the email (never the password)", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: null, user: null }, error: { message: "Invalid login credentials" } })
    const state = await loginAction(INITIAL_AUTH_STATE, form({ email: " Ada@Example.com ", password: "wrong" }))
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "ada@example.com", password: "wrong" })
    expect(state.status).toBe("error")
    expect(state.message).toMatch(/email or password is incorrect/)
    expect(state.values).toEqual({ email: "ada@example.com" })
  })

  it("lands on the smart destination in one request: no getUser, bootstrap RPC or /launch", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session, user }, error: null })
    const state = await loginAction(INITIAL_AUTH_STATE, form({ email: "ada@example.com", password: "secret123" }))
    expect(state).toEqual({ status: "success", redirectTo: "/orgs/org-1" })
    expect(mocks.landingForSession).toHaveBeenCalledWith("at", "u1")
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("returns to the requested page, ignoring off-site values", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session, user }, error: null })
    expect(await loginAction(INITIAL_AUTH_STATE, form({ email: "a@b.co", password: "p", next: "/tickets" }))).toEqual({
      status: "success",
      redirectTo: "/tickets",
    })
    expect(mocks.landingForSession).not.toHaveBeenCalled()
    expect(await loginAction(INITIAL_AUTH_STATE, form({ email: "a@b.co", password: "p", next: "//evil.example" }))).toEqual({
      status: "success",
      redirectTo: "/orgs/org-1",
    })
  })
})

describe("signupAction", () => {
  const valid = { firstName: "Ada", surname: "Lovelace", phone: "+268 7600 0000", email: "ada@example.com", password: "longenough" }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.origin = "https://organizer.ticketiv.app"
  })

  it("requires every field and an 8+ character password", async () => {
    expect((await signupAction(INITIAL_AUTH_STATE, form({ ...valid, phone: "" }))).status).toBe("error")
    const short = await signupAction(INITIAL_AUTH_STATE, form({ ...valid, password: "short" }))
    expect(short.message).toMatch(/at least 8/)
    expect(short.values).not.toHaveProperty("password")
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it("passes the profile details to the sign-up trigger and confirms via this origin", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null, user }, error: null })
    const state = await signupAction(INITIAL_AUTH_STATE, form(valid))
    expect(state.status).toBe("check-email")
    const args = mocks.signUp.mock.calls[0][0]
    expect(args.options.emailRedirectTo).toBe("https://organizer.ticketiv.app/auth/callback?next=%2F")
    expect(args.options.data).toMatchObject({ first_name: "Ada", surname: "Lovelace", phone: "+268 7600 0000", signup_intent: "account" })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("signs straight in when email confirmation is off", async () => {
    mocks.signUp.mockResolvedValue({ data: { session, user }, error: null })
    expect(await signupAction(INITIAL_AUTH_STATE, form({ ...valid, next: "/events/x" }))).toEqual({
      status: "success",
      redirectTo: "/events/x",
    })
  })

  it("falls back to the public origin when the browser sent none", async () => {
    mocks.origin = null
    mocks.signUp.mockResolvedValue({ data: { session: null, user }, error: null })
    await signupAction(INITIAL_AUTH_STATE, form(valid))
    expect(mocks.signUp.mock.calls[0][0].options.emailRedirectTo).toMatch(/^https:\/\/[^/]+\/auth\/callback\?next=%2F$/)
  })
})

describe("auth refactor guards", () => {
  it("keeps the per-login profile bootstrap out of the app (the sign-up trigger owns it)", () => {
    for (const file of [
      "app/(auth)/actions.ts",
      "app/auth/callback/route.ts",
      "app/auth/confirm/route.ts",
      "components/auth/login-form.tsx",
      "components/auth/signup-form.tsx",
    ]) {
      expect(read(file), file).not.toContain("fn_bootstrap_ticketiv_user")
    }
    const migration = read("supabase/migrations/20261105100000_signup_creates_private_profile.sql")
    expect(migration).toContain("insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)")
    expect(migration).toMatch(/values \(new\.id, v_name, v_surname, v_display_name, null\)/)
  })

  it("verifies the session once per request and with getClaims in the proxy", () => {
    expect(read("lib/auth/session.ts")).toContain("export const getAuthUser = cache(")
    expect(read("lib/auth.ts")).toContain("await getAuthUser()")
    expect(read("lib/data/identity/contexts.ts")).toContain("await getAuthUser()")
    const proxy = read("lib/supabase/middleware.ts")
    expect(proxy).toContain("supabase.auth.getClaims()")
    expect(proxy).not.toContain("supabase.auth.getUser()")
  })

  it("sends admins straight to the command centre", () => {
    expect(read("app/(auth)/super-admin/login/page.tsx")).toContain('<LoginForm next="/super-admin" internal />')
  })
})
