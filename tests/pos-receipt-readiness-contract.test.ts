import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { migrationFunction, migrationStatementsMatching } from "./helpers/migration-contract"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("POS receipt and shift readiness", () => {
  it("keeps POS lifecycle audit rows inside the shared audit_action taxonomy", () => {
    const lifecycle: Array<[string, string]> = [
      ["public.fn_open_pos_shift", "pos_shift_open"],
      ["public.fn_close_pos_shift", "pos_shift_close"],
      ["public.fn_pos_charge_with_shift", "pos_sale"],
    ]

    for (const [fn, eventType] of lifecycle) {
      const migration = migrationFunction(fn)

      expect(migration, `${fn} does not record ${eventType}`).toContain(`'event_type', '${eventType}'`)
      expect(migration, `${fn} does not log under the shared 'other' action`).toContain("'other'")
    }

    expect(
      migrationStatementsMatching(/^alter type[\s\S]*add value/),
      "POS lifecycle events must reuse the audit_action taxonomy, not extend the enum",
    ).toEqual([])
  })

  it("allows POS to fill contact fields only while they are unset", () => {
    const guard = migrationFunction("public.prevent_buyer_contact_update")

    expect(guard).toContain("old.buyer_email is not null")
    expect(guard).toContain("old.buyer_phone is not null")
    expect(guard).toContain("buyer_email and buyer_phone are immutable once set")
  })

  it("verifies receipts through the real shift-aware POS charge path", () => {
    const verifier = read("scripts/verify-pos-receipts.sql")

    expect(verifier).toContain("insert into public.venues")
    expect(verifier).toContain("v_charge := public.fn_pos_charge_with_shift")
    expect(verifier).toContain("fn_pos_receipt(v_online_order)")
    expect(verifier).toContain("fn_pos_shift_transactions(v_shift, 10)")
  })
})
