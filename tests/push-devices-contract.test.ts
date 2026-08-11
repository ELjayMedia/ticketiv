import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// TICK-324 — native push device registry.
//
// The three platform adapters (FCM/APNs/HMS) land with the RN app shells. This
// covers the half that lives server-side, where the failure modes are quiet and
// expensive:
//
//   * a device that changes hands keeps delivering the new owner's
//     notifications to the previous account
//   * a rotated token accumulates dead rows instead of refreshing one
//   * the sender forgets the mute check and pushes a type the user silenced
//   * the sender lookup, which reads every user's tokens, becomes reachable
//     from a browser session
//
// The behaviour itself was proven against the live database in rolled-back
// probes (see the PR). These are the credential-free guards that keep the
// contract from drifting afterwards.

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

const MIGRATION = "supabase/migrations/20260811190000_native_push_devices.sql"

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
    // fn_push_targets_for_user takes any user id and returns their live tokens.
    // Reachable from a session, it is a token-harvesting endpoint.
    const grantees = grantsFor("fn_push_targets_for_user")

    expect(grantees, "fn_push_targets_for_user is missing from the permission snapshot").toBeDefined()
    expect(grantees).not.toContain("anon")
    expect(grantees).not.toContain("authenticated")
    expect(grantees).toContain("service_role")
  })

  it("keeps token retirement service-role only", () => {
    // Driven by provider send results (FCM UNREGISTERED, APNs 410), never by a
    // client — otherwise anyone could silence another device.
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
    // Putting it beside the token query is what stops a future sender from
    // forgetting it. notification_mutes rows are opt-out: a row means muted.
    const migration = read(MIGRATION)
    const lookup = migration.slice(migration.indexOf("function public.fn_push_targets_for_user"))

    expect(lookup).toContain("notification_mutes")
    expect(lookup).toMatch(/not\s+exists/i)
    expect(lookup).toContain("p_notification_type")
  })

  it("excludes tokens the provider has reported dead", () => {
    const migration = read(MIGRATION)
    const lookup = migration.slice(migration.indexOf("function public.fn_push_targets_for_user"))

    expect(lookup).toMatch(/disabled_at\s+is\s+null/i)
  })

  it("reassigns a token when a handset changes owner", () => {
    // Without this the previous account keeps receiving the new owner's
    // notifications — the same physical token delivering to two people.
    const migration = read(MIGRATION)

    expect(migration).toMatch(/delete\s+from\s+public\.push_devices[\s\S]{0,200}user_id\s*<>\s*v_user/i)
    expect(migration).toContain("push_devices_service_token_key")
  })

  it("refreshes a rotated token in place instead of accumulating rows", () => {
    const migration = read(MIGRATION)

    expect(migration).toContain("unique (user_id, service, device_id)")
    expect(migration).toMatch(/on conflict \(user_id, service, device_id\) do update/)
  })

  it("grants SELECT back after the blanket revoke, or the RLS policy is dead", () => {
    // RLS narrows an existing privilege; it does not create one. `revoke all`
    // followed by a select policy and no grant means owners cannot read their
    // own devices at all.
    const migration = read(MIGRATION)

    expect(migration).toContain("grant select on public.push_devices to authenticated")
    expect(migration).toContain("push_devices_select_own")
    // Writes stay closed so they can only go through the definer RPCs.
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^\n]*push_devices[^\n]*authenticated/i)
  })
})
