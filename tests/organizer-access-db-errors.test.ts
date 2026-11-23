// A database fault (for example a lost column grant) must surface as an
// error, never as "no access". UAT once lost its profiles grants and every
// organiser was sent to /403 or bounced to /login with nothing in the logs
// beyond "Profile not found".
import { beforeEach, describe, expect, it, vi } from "vitest"

type Result = { data: unknown; error: { code: string; message: string } | null }
const results: Record<string, Result> = {}

function query(table: string) {
  const res = () => results[table] ?? { data: null, error: null }
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    maybeSingle: async () => res(),
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(res()).then(resolve, reject),
  }
  return chain
}

const client = { from: (table: string) => query(table), auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseClient: () => client }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => client }))
vi.mock("@/lib/auth/session", () => ({ getAuthUser: async () => ({ id: "u1" }) }))
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`) } }))

const denied = { code: "42501", message: "permission denied for table profiles" }

beforeEach(() => {
  for (const key of Object.keys(results)) delete results[key]
})

describe("loadUserPermissions", () => {
  it("throws when the profile query fails instead of reporting no profile", async () => {
    const { loadUserPermissions } = await import("@/lib/permissions-loader")
    results.profiles = { data: null, error: denied }
    await expect(loadUserPermissions("u1")).rejects.toThrow(/profiles.*42501/)
  })

  it("throws when memberships cannot be read", async () => {
    const { loadUserPermissions } = await import("@/lib/permissions-loader")
    results.profiles = { data: { user_id: "u1", display_name: "A" }, error: null }
    results.org_members = { data: null, error: denied }
    await expect(loadUserPermissions("u1")).rejects.toThrow(/org_members/)
  })

  it("still returns null for a user who genuinely has no profile", async () => {
    const { loadUserPermissions } = await import("@/lib/permissions-loader")
    results.profiles = { data: null, error: null }
    await expect(loadUserPermissions("u1")).resolves.toBeNull()
  })

  it("loads memberships when every query succeeds", async () => {
    const { loadUserPermissions } = await import("@/lib/permissions-loader")
    results.profiles = { data: { user_id: "u1", display_name: "A" }, error: null }
    results.org_members = { data: [{ org_id: "o1", role: "organizer_admin", created_at: "x" }], error: null }
    results.event_staff = { data: [], error: null }
    const res = await loadUserPermissions("u1")
    expect(res?.permissions.orgMemberships).toHaveLength(1)
    expect(res?.permissions.isGlobalAdmin).toBe(false)
  })
})

describe("getOrganizerAccess", () => {
  it("throws on a failed membership query instead of denying access", async () => {
    const { getOrganizerAccess } = await import("@/lib/organizer/access")
    results.org_members = { data: null, error: denied }
    await expect(getOrganizerAccess("org-a")).rejects.toThrow(/org_members.*42501/)
  })

  it("returns null for a user with no role in the organisation", async () => {
    const { getOrganizerAccess } = await import("@/lib/organizer/access")
    results.event_staff = { data: [], error: null }
    await expect(getOrganizerAccess("org-b")).resolves.toBeNull()
  })
})
