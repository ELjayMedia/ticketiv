import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// TICK-320 — in-app account deletion is a hard store gate (Apple 5.1.1(v), Play
// data-deletion policy). The flow works; nothing was stopping it from quietly
// breaking.
//
// The failure modes worth guarding are all silent ones. Deleting the profile but
// leaving the auth user means the person can still sign in and the store
// requirement is unmet. Moving the destructive call onto the user's own client
// would make deletion depend on RLS instead of a service-role RPC. Dropping the
// confirmation or the blocker check turns a mis-click into an irreversible
// delete. None of those break a build.
//
// Static assertions on purpose: no database credentials, so they run on every PR.

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

const ACTION = "app/(app)/account/settings/actions.ts"
const MIGRATION = "supabase/migrations/20260717193000_account_deletion_rpcs.sql"

function permissionSnapshot() {
  const base = JSON.parse(read("supabase/permissions/rpc-grants.json")).functions as Array<{
    name: string
    grantees: string[]
  }>
  const additions = JSON.parse(read("supabase/permissions/rpc-grants.additions.json"))
    .functions as Array<{ name: string; grantees: string[] }>
  return [...base, ...additions]
}

describe("account deletion contract (TICK-320)", () => {
  it("actually removes the auth user, or the store requirement is not met", () => {
    // "Account deletion completes in-app end-to-end; auth user cannot sign in
    // afterwards." Anonymising the profile alone would leave a working login.
    expect(read(MIGRATION)).toMatch(/delete\s+from\s+auth\.users/i)
  })

  it("keeps the destructive RPC service-role only", () => {
    const fn = permissionSnapshot().find((f) => f.name === "fn_delete_account_for_user")

    expect(fn, "fn_delete_account_for_user is missing from the permission snapshot").toBeDefined()
    expect(fn!.grantees).not.toContain("anon")
    expect(fn!.grantees).not.toContain("authenticated")
    expect(fn!.grantees).toContain("service_role")
  })

  it("revokes the destructive RPC from the browser roles in the migration itself", () => {
    // Supabase grants EXECUTE to anon/authenticated on function creation, so the
    // migration has to revoke explicitly — revoking from PUBLIC is not enough.
    const migration = read(MIGRATION)
    const revoke = migration.slice(migration.indexOf("revoke execute on function public.fn_delete_account_for_user"))

    expect(revoke).toMatch(/revoke execute on function public\.fn_delete_account_for_user\(uuid\)/)
    expect(revoke.slice(0, 300)).toMatch(/anon|authenticated|public/)
  })

  it("requires an explicit typed confirmation", () => {
    expect(read(ACTION)).toContain('confirmation !== "DELETE"')
  })

  it("refuses to delete before checking the blockers", () => {
    // Upcoming paid tickets or a sole org-owner role must stop the delete, and
    // the check has to happen server-side rather than being trusted from the UI.
    const action = read(ACTION)

    expect(action).toContain("fn_get_my_account_deletion_status")
    expect(action).toContain("canDelete")
    expect(action.indexOf("fn_get_my_account_deletion_status")).toBeLessThan(
      action.indexOf("fn_delete_account_for_user"),
    )
  })

  it("performs the delete with the service-role client, never the caller's", () => {
    const action = read(ACTION)

    expect(action).toContain('admin.rpc("fn_delete_account_for_user"')
    // The user-scoped client must not be the one issuing the destructive call.
    expect(action).not.toMatch(/supabase\.rpc\(\s*"fn_delete_account_for_user"/)
  })

  it("drops every active session before deleting the account", () => {
    const action = read(ACTION)

    expect(action).toContain('signOut({ scope: "global" })')
    expect(action.indexOf("signOut")).toBeLessThan(action.indexOf('admin.rpc("fn_delete_account_for_user"'))
  })

  it("keeps the public data-deletion URL, which Play Data Safety requires", () => {
    expect(fs.existsSync(path.join(root, "app/(consumer)/data-deletion/page.tsx"))).toBe(true)
  })
})
