import { appendFileSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const PLAY_APPS = {
  ticketiv: { packageName: "com.ticketiv.app", workflow: ".github/workflows/ticketiv-android.yml" },
  access: { packageName: "com.ticketiv.access", workflow: ".github/workflows/access-android.yml" },
}

function requireThat(condition, message) {
  if (!condition) throw new Error(message)
}

export function releaseInputs({ app, commit, sourceRunId, versionCode }) {
  requireThat(Object.hasOwn(PLAY_APPS, app), "app must be ticketiv or access")
  requireThat(/^[a-f0-9]{40}$/.test(commit ?? ""), "commit must be a full lowercase Git SHA")
  for (const [key, value] of Object.entries({ sourceRunId, versionCode })) {
    requireThat(/^[1-9][0-9]*$/.test(String(value)) && Number.isSafeInteger(Number(value)), `${key} must be a positive integer`)
  }
  requireThat(Number(versionCode) <= 2100000000, "versionCode exceeds Google Play's limit")
  return { app, commit, sourceRunId: Number(sourceRunId), versionCode: Number(versionCode) }
}

function successfulRun(run, { commit, event, workflow, repository }) {
  return run.head_sha === commit && run.head_branch === "main" && run.event === event &&
    run.path === workflow && run.status === "completed" && run.conclusion === "success" &&
    run.repository?.full_name === repository
}

// The caller supplies a GitHub GET function, which also makes every failure path
// testable without credentials or network access.
export async function verifyPlayRelease(input, get, repository) {
  const options = releaseInputs(input)
  requireThat(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? ""), "Invalid repository")
  const { app, commit, sourceRunId, versionCode } = options
  const prefix = `/repos/${repository}`
  const run = await get(`${prefix}/actions/runs/${sourceRunId}`)
  requireThat(run.id === sourceRunId && successfulRun(run, {
    commit, event: "workflow_dispatch", workflow: PLAY_APPS[app].workflow, repository,
  }), "Source run must be a successful signed dispatch for this app and exact commit on main")
  requireThat(run.run_number === versionCode, "Version code must equal the signed source run number")
  requireThat(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, "Source run has no valid attempt")

  const comparison = await get(`${prefix}/compare/${commit}...main`)
  requireThat(["ahead", "identical"].includes(comparison.status), "Release commit is no longer on main")

  const jobs = await listAll(get, `${prefix}/actions/runs/${sourceRunId}/attempts/${run.run_attempt}/jobs`, "jobs")
  const signedJobs = jobs.filter((job) => job.name === "upload-signed Play bundle")
  requireThat(signedJobs.length === 1 && signedJobs[0].conclusion === "success", "Signed upload job did not succeed")
  for (const stepName of ["Build upload-signed Play AAB", "Verify signature and publish certificate fingerprint", "Publish to Play Internal testing"]) {
    requireThat(signedJobs[0].steps?.some((step) => step.name === stepName && step.conclusion === "success"), `${stepName} did not succeed`)
  }

  const runs = await listAll(get, `${prefix}/actions/runs?head_sha=${commit}&event=push&branch=main`, "workflow_runs")
  for (const workflow of [".github/workflows/ci.yml", PLAY_APPS[app].workflow]) {
    // An old successful run must not hide a newer failed/in-progress rerun.
    const candidates = runs.filter((candidate) => candidate.path === workflow && candidate.head_sha === commit && candidate.head_branch === "main" && candidate.event === "push")
      .sort((a, b) => b.id - a.id)
    requireThat(candidates.length > 0 && successfulRun(candidates[0], { commit, event: "push", workflow, repository }), `Latest ${workflow} push run must succeed for the exact release commit`)
  }

  const receiptName = `play-release-receipt-${app}-${sourceRunId}-${run.run_attempt}`
  const artifacts = await listAll(get, `${prefix}/actions/runs/${sourceRunId}/artifacts`, "artifacts")
  const receipts = artifacts.filter((artifact) => artifact.name === receiptName)
  requireThat(receipts.length === 1 && !receipts[0].expired, "Source run receipt is missing or expired; produce a new verified internal release")
  return { ...options, packageName: PLAY_APPS[app].packageName, runAttempt: run.run_attempt, receiptName }
}

export function verifyReceipt(receipt, verified) {
  const expected = {
    schemaVersion: 1, app: verified.app, packageName: verified.packageName,
    commit: verified.commit, runId: verified.sourceRunId,
    runAttempt: verified.runAttempt, versionCode: verified.versionCode,
  }
  for (const [key, value] of Object.entries(expected)) {
    requireThat(receipt[key] === value, `Release receipt ${key} does not match the verified source run`)
  }
  requireThat(/^[a-f0-9]{64}$/.test(receipt.bundleSha256 ?? ""), "Receipt requires a SHA-256 bundle digest")
  return receipt.bundleSha256
}

async function listAll(get, endpoint, key) {
  const result = []
  for (let page = 1; page <= 100; page++) {
    const separator = endpoint.includes("?") ? "&" : "?"
    const response = await get(`${endpoint}${separator}per_page=100&page=${page}`)
    requireThat(Array.isArray(response[key]), `GitHub response is missing ${key}`)
    result.push(...response[key])
    if (response[key].length < 100) return result
  }
  throw new Error(`Too many GitHub ${key} pages; refusing incomplete verification`)
}

export function argumentsFrom(argv) {
  const values = {}
  for (let i = 0; i < argv.length; i += 2) {
    requireThat(["--app", "--commit", "--source-run-id", "--version-code", "--receipt"].includes(argv[i]) && argv[i + 1] && !argv[i + 1].startsWith("--"), `Invalid argument ${argv[i]}`)
    requireThat(!Object.hasOwn(values, argv[i]), `Duplicate argument ${argv[i]}`)
    values[argv[i]] = argv[i + 1]
  }
  return { app: values["--app"], commit: values["--commit"], sourceRunId: values["--source-run-id"], versionCode: values["--version-code"], receipt: values["--receipt"] }
}

async function main() {
  const options = argumentsFrom(process.argv.slice(2))
  requireThat(process.env.GH_TOKEN, "GH_TOKEN is required")
  const get = async (endpoint) => {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(30000),
    })
    requireThat(response.ok, `GitHub GET failed (${response.status}) for ${endpoint}`)
    return response.json()
  }
  const verified = await verifyPlayRelease(options, get, process.env.GITHUB_REPOSITORY)
  const output = { receipt_name: verified.receiptName, source_run_id: verified.sourceRunId, version_code: verified.versionCode }
  if (options.receipt) output.bundle_sha256 = verifyReceipt(JSON.parse(readFileSync(options.receipt, "utf8")), verified)
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(output).map(([key, value]) => `${key}=${value}\n`).join(""))
  }
  console.log(`Verified ${verified.app} version ${verified.versionCode} from ${verified.commit}${options.receipt ? " and signed bundle receipt" : ""}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
