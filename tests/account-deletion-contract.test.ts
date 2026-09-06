import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { migrationFunction, migrationFunctionGrants } from "./helpers/migration-contract"

// TICK-320 — in-app account deletion is a hard store gate (Apple 5.1.1(v), Play
// data-deletion policy). Static assertions run on every PR without DB credentials.

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

const ACTION = "app/(app)/account/settings/actions.ts"
const deletionMigration = () => migrationFunction("public.fn_delete_account_for_user")

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
    expect(deletionMigration()).toMatch(/delete\s+from\s+auth\.users/i)
  })

  it("keeps the destructive RPC service-role only", () => {
    const fn = permissionSnapshot().find((f) => f.name === "fn_delete_account_for_user")

    expect(fn, "fn_delete_account_for_user is missing from the permission snapshot").toBeDefined()
    expect(fn!.grantees).not.toContain("anon")
    expect(fn!.grantees).not.toContain("authenticated")
    expect(fn!.grantees).toContain("service_role")
  })

  it("revokes the destructive RPC from the browser roles in the migration itself", () => {
    const grants = migrationFunctionGrants("public.fn_delete_account_for_user")

    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(grants.grantees).not.toContain("anon")
    expect(grants.grantees).not.toContain("authenticated")
    expect(grants.grantees).toContain("service_role")
  })

  it("requires an explicit typed confirmation", () => {
    expect(read(ACTION)).toContain('confirmation !== "DELETE"')
  })

  it("refuses to delete before checking the blockers", () => {
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
