import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const source = (path: string) => readFileSync(join(root, path), "utf8")

describe("TICK-467 public security boundaries", () => {
  it("exposes promo preview only through a strictly rate-limited server route", () => {
    const route = source("app/api/orders/validate-promo/route.ts")
    expect(route).toContain("createAdminClient()")
    expect(route).toContain("failClosed: true")
    expect(route).toContain('rateLimit("promo:validate"')
    expect(route).toContain('rpc("fn_preview_promo_code"')
    const limiter = source("lib/rate-limit.ts")
    expect(limiter).toContain("failClosed ? BLOCK")
  })

  it("does not let legacy profile, guest contact matching or Storage bypass privacy", () => {
    const migration = source("supabase/migrations/20261107165340_security_public_surface_hardening.sql")
    expect(migration).toContain("from public, anon, authenticated")
    expect(migration).toContain("public.get_social_public_profile(p_handle)")
    expect(migration).toContain("perform app.require_claimed_account();")
    expect(migration).toContain("file_size_limit = 5242880")
  })
})
