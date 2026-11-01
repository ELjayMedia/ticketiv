import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { pathToFileURL } from "node:url"
import { PLAY_APPS, releaseInputs } from "./verify-play-release.mjs"

export function createReceipt(app, bundle, env) {
  const input = releaseInputs({ app, commit: env.GITHUB_SHA, sourceRunId: env.GITHUB_RUN_ID, versionCode: env.GITHUB_RUN_NUMBER })
  const runAttempt = Number(env.GITHUB_RUN_ATTEMPT)
  if (!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? "") || !Number.isSafeInteger(runAttempt)) throw new Error("GITHUB_RUN_ATTEMPT must be a positive integer")
  if (!bundle.length) throw new Error("Cannot create a receipt for an empty bundle")
  return {
    schemaVersion: 1, app, packageName: PLAY_APPS[app].packageName,
    commit: input.commit, runId: input.sourceRunId, runAttempt,
    versionCode: input.versionCode, bundleSha256: createHash("sha256").update(bundle).digest("hex"),
  }
}

function main() {
  const args = process.argv.slice(2)
  const options = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!["--app", "--bundle", "--output"].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) throw new Error(`Invalid argument ${args[i]}`)
    options[args[i]] = args[i + 1]
  }
  if (!options["--bundle"] || !options["--output"]) throw new Error("--bundle and --output are required")
  const receipt = createReceipt(options["--app"], readFileSync(options["--bundle"]), process.env)
  mkdirSync(dirname(options["--output"]), { recursive: true })
  writeFileSync(options["--output"], `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(`Recorded signed ${receipt.app} bundle provenance for version ${receipt.versionCode}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch (error) { console.error(error.message); process.exitCode = 1 }
}
