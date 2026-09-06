import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { migrationContractAround } from "./helpers/migration-contract"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")
const pushMigration = () =>
  migrationContractAround("create table if not exists public.push_devices", 2_000, 30_000)

function snapshot() {
  const base = JSON.parse(read("supabase/permissions/rpc-grants.json")).functions as Array<{
    name: string
    grantees: string[]
  }>
  const additions = JSON.parse(read("supabase/permissions/rpc-grants.additions.json"))
    .functions as Array<{ name: string; grantees: string[] }>
  return [...base, ...additions]
}

const grantsFor = (name: string) => snapshot().find((f) => f.name === name)?.grantees

describe("native push device contract (TICK-324)", () => {
  it("keeps the sender lookup off the browser entirely", () => {
    const grantees = grantsFor("fn_push_targets_for_user")

    expect(grantees, "fn_push_targets_for_user is missing from the permission snapshot").toBeDefined()
    expect(grantees).not.toContain("anon")
    expect(grantees).not.toContain("authenticated")
    expect(grantees).toContain("service_role")
  })

  it("keeps token retirement service-role only", () => {
    const grantees = grantsFor("fn_disable_push_device_token")

    expect(grantees).toBeDefined()
    expect(grantees).not.toContain("anon")
    expect(grantees).not.toContain("authenticated")
    expect(grantees).toContain("service_role")
  })

  it("lets a signed-in user register and unregister their own device", () => {
    for (const fn of ["fn_register_push_device", "fn_unregister_push_device"]) {
      const grantees = grantsFor(fn)
      expect(grantees, `${fn} is missing from the permission snapshot`).toBeDefined()
      expect(grantees).toContain("authenticated")
      expect(grantees).not.toContain("anon")
    }
  })

  it("applies the mute check inside the target lookup, not in the caller", () => {
    const migration = pushMigration()
    const lookup = migration.slice(migration.indexOf("function public.fn_push_targets_for_user"))

    expect(lookup).toContain("notification_mutes")
    expect(lookup).toMatch(/not\s+exists/i)
    expect(lookup).toContain("p_notification_type")
  })

  it("excludes tokens the provider has reported dead", () => {
    const migration = pushMigration()
    const lookup = migration.slice(migration.indexOf("function public.fn_push_targets_for_user"))

    expect(lookup).toMatch(/disabled_at\s+is\s+null/i)
  })

  it("reassigns a token when a handset changes owner", () => {
    const migration = pushMigration()

    expect(migration).toMatch(/delete\s+from\s+public\.push_devices[\s\S]{0,200}user_id\s*<>\s*v_user/i)
    expect(migration).toContain("push_devices_service_token_key")
  })

  it("refreshes a rotated token in place instead of accumulating rows", () => {
    const migration = pushMigration()

    expect(migration).toContain("unique (user_id, service, device_id)")
    expect(migration).toMatch(/on conflict \(user_id, service, device_id\) do update/)
  })

  it("grants SELECT back after the blanket revoke, or the RLS policy is dead", () => {
    const migration = pushMigration()

    expect(migration).toContain("grant select on public.push_devices to authenticated")
    expect(migration).toContain("push_devices_select_own")
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^\n]*push_devices[^\n]*authenticated/i)
  })
})
