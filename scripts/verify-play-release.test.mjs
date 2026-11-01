import assert from "node:assert/strict"
import { test } from "node:test"
import { argumentsFrom, releaseInputs, verifyPlayRelease, verifyReceipt } from "./verify-play-release.mjs"

const commit = "a".repeat(40)
const repository = "example/ticketiv"
const input = { app: "ticketiv", commit, sourceRunId: "42", versionCode: "30" }

function fixture() {
  const common = { head_sha: commit, head_branch: "main", status: "completed", conclusion: "success", repository: { full_name: repository } }
  const source = { ...common, id: 42, run_number: 30, run_attempt: 2, event: "workflow_dispatch", path: ".github/workflows/ticketiv-android.yml" }
  const jobs = [{ name: "upload-signed Play bundle", conclusion: "success", steps: [
    { name: "Build upload-signed Play AAB", conclusion: "success" },
    { name: "Verify signature and publish certificate fingerprint", conclusion: "success" },
    { name: "Publish to Play Internal testing", conclusion: "success" },
  ] }]
  const runs = [
    { ...common, id: 50, event: "push", path: ".github/workflows/ci.yml" },
    { ...common, id: 51, event: "push", path: ".github/workflows/ticketiv-android.yml" },
  ]
  const artifacts = [{ name: "play-release-receipt-ticketiv-42-2", expired: false }]
  const comparison = { status: "ahead" }
  const calls = []
  const get = async (path) => {
    calls.push(path)
    if (path.endsWith("/actions/runs/42")) return source
    if (path.includes("/compare/")) return comparison
    if (path.includes("/attempts/2/jobs?")) return { jobs }
    if (path.includes("/actions/runs?")) return { workflow_runs: runs }
    if (path.includes("/artifacts?")) return { artifacts }
    throw new Error(`Unexpected GET ${path}`)
  }
  return { source, jobs, runs, artifacts, comparison, calls, get }
}

test("accepts an exact tested commit, published signed source and matching receipt", async () => {
  const f = fixture()
  const verified = await verifyPlayRelease(input, f.get, repository)
  assert.equal(verified.receiptName, "play-release-receipt-ticketiv-42-2")
  assert.equal(verified.versionCode, 30)
  assert.equal(verifyReceipt({ schemaVersion: 1, app: "ticketiv", packageName: "com.ticketiv.app", commit, runId: 42, runAttempt: 2, versionCode: 30, bundleSha256: "b".repeat(64) }, verified), "b".repeat(64))
  assert.ok(f.calls.some((path) => path.includes(`head_sha=${commit}&event=push&branch=main`)))
  assert.ok(f.calls.some((path) => path.includes("/attempts/2/jobs")))
})

const sourceFailures = [
  ["another app", { path: ".github/workflows/access-android.yml" }],
  ["another commit", { head_sha: "b".repeat(40) }],
  ["another repository", { repository: { full_name: "attacker/ticketiv" } }],
  ["feature branch", { head_branch: "feature" }],
  ["unsigned push", { event: "push" }],
  ["failed source", { conclusion: "failure" }],
  ["incomplete source", { status: "in_progress" }],
  ["wrong version", { run_number: 31 }],
]
for (const [name, update] of sourceFailures) test(`rejects ${name}`, async () => {
  const f = fixture()
  Object.assign(f.source, update)
  await assert.rejects(verifyPlayRelease(input, f.get, repository))
})

test("does not accept a green unsigned run with a skipped signed job", async () => {
  const f = fixture()
  f.jobs[0].conclusion = "skipped"
  await assert.rejects(verifyPlayRelease(input, f.get, repository), /Signed upload job/)
})

for (const outcome of ["skipped", "failure", "cancelled"]) test(`rejects ${outcome} Play publish even when the run is green`, async () => {
  const f = fixture()
  f.jobs[0].steps[2].conclusion = outcome
  await assert.rejects(verifyPlayRelease(input, f.get, repository), /Publish to Play Internal testing/)
})

test("rejects commits removed from main", async () => {
  const f = fixture()
  f.comparison.status = "diverged"
  await assert.rejects(verifyPlayRelease(input, f.get, repository), /no longer on main/)
})

for (const index of [0, 1]) test(`requires exact-commit successful gate ${index}`, async () => {
  const f = fixture()
  f.runs[index].head_sha = "b".repeat(40)
  await assert.rejects(verifyPlayRelease(input, f.get, repository), /Latest .* push run/)
})

test("newer failed CI cannot be hidden by an earlier successful run", async () => {
  const f = fixture()
  f.runs.push({ ...f.runs[0], id: 99, conclusion: "failure" })
  await assert.rejects(verifyPlayRelease(input, f.get, repository), /Latest .*ci.yml/)
})

for (const kind of ["expired", "missing", "wrong attempt", "duplicate"]) test(`rejects ${kind} provenance artifact`, async () => {
  const f = fixture()
  if (kind === "expired") f.artifacts[0].expired = true
  if (kind === "missing") f.artifacts.length = 0
  if (kind === "wrong attempt") f.artifacts[0].name = "play-release-receipt-ticketiv-42-1"
  if (kind === "duplicate") f.artifacts.push({ ...f.artifacts[0] })
  await assert.rejects(verifyPlayRelease(input, f.get, repository), /receipt is missing or expired/)
})

test("receipt cannot substitute another app, code, commit, attempt or digest", async () => {
  const f = fixture()
  const verified = await verifyPlayRelease(input, f.get, repository)
  const valid = { schemaVersion: 1, app: "ticketiv", packageName: "com.ticketiv.app", commit, runId: 42, runAttempt: 2, versionCode: 30, bundleSha256: "b".repeat(64) }
  for (const [key, value] of Object.entries({ schemaVersion: 2, app: "access", packageName: "com.ticketiv.access", commit: "c".repeat(40), runId: 99, runAttempt: 1, versionCode: 31, bundleSha256: "invalid" })) {
    assert.throws(() => verifyReceipt({ ...valid, [key]: value }, verified))
  }
})

test("reads additional API pages instead of missing the gate or receipt", async () => {
  const f = fixture()
  const get = async (path) => {
    if (path.includes("workflow_runs") || path.includes("/actions/runs?")) {
      if (path.endsWith("page=1")) return { workflow_runs: Array.from({ length: 100 }, (_, i) => ({ id: i, path: "unrelated.yml" })) }
      return { workflow_runs: f.runs }
    }
    return f.get(path)
  }
  await verifyPlayRelease(input, get, repository)
})

test("rejects shell-like inputs and imprecise run IDs before requests", () => {
  for (const change of [{ commit: "main" }, { commit: "$(env)" }, { sourceRunId: "1; echo" }, { sourceRunId: "9007199254740993" }, { versionCode: "0" }, { versionCode: "2100000001" }, { app: "toString" }]) {
    assert.throws(() => releaseInputs({ ...input, ...change }))
  }
  assert.throws(() => argumentsFrom(["--app", "ticketiv", "--app", "access"]))
  assert.throws(() => argumentsFrom(["--app"]))
})
