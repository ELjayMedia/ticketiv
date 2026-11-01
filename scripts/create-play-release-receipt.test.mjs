import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { test } from "node:test"
import { createReceipt } from "./create-play-release-receipt.mjs"

const env = { GITHUB_SHA: "a".repeat(40), GITHUB_RUN_ID: "42", GITHUB_RUN_NUMBER: "30", GITHUB_RUN_ATTEMPT: "2" }

test("records the exact signed bytes and GitHub run identity for each app", () => {
  const bundle = Buffer.from("signed bundle bytes")
  for (const [app, packageName] of [["ticketiv", "com.ticketiv.app"], ["access", "com.ticketiv.access"]]) {
    assert.deepEqual(createReceipt(app, bundle, env), {
      schemaVersion: 1, app, packageName, commit: env.GITHUB_SHA, runId: 42, runAttempt: 2,
      versionCode: 30, bundleSha256: createHash("sha256").update(bundle).digest("hex"),
    })
  }
})

test("refuses incomplete or invalid release context and empty bundles", () => {
  assert.throws(() => createReceipt("ticketiv", Buffer.alloc(0), env), /empty bundle/)
  assert.throws(() => createReceipt("ticketiv", Buffer.from("bytes"), { ...env, GITHUB_SHA: "main" }), /full lowercase/)
  assert.throws(() => createReceipt("ticketiv", Buffer.from("bytes"), { ...env, GITHUB_RUN_ATTEMPT: "NaN" }), /positive integer/)
})
