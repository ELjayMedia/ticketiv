import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("POS receipt and shift readiness", () => {
  it("keeps POS lifecycle audit rows inside the shared audit_action taxonomy", () => {
    const migration = read(
      "supabase/migrations/20260727230509_fix_pos_shift_audit_actions.sql",
    )

    expect(migration).toContain("'event_type'', ''pos_shift_open'")
    expect(migration).toContain("'event_type'', ''pos_shift_close'")
    expect(migration).toContain("'event_type'', ''pos_sale'")
    expect(migration).toContain("''other''")
    expect(migration).not.toContain("add value")
  })

  it("allows POS to fill contact fields only while they are unset", () => {
    const migration = read(
      "supabase/migrations/20260727230509_fix_pos_shift_audit_actions.sql",
    )

    expect(migration).toContain("old.buyer_email is not null")
    expect(migration).toContain("old.buyer_phone is not null")
    expect(migration).toContain("buyer_email and buyer_phone are immutable once set")
  })

  it("verifies receipts through the real shift-aware POS charge path", () => {
    const verifier = read("scripts/verify-pos-receipts.sql")

    expect(verifier).toContain("insert into public.venues")
    expect(verifier).toContain("v_charge := public.fn_pos_charge_with_shift")
    expect(verifier).toContain("fn_pos_receipt(v_online_order)")
    expect(verifier).toContain("fn_pos_shift_transactions(v_shift, 10)")
  })
})
