import { execFileSync } from "node:child_process"

const repo = process.env.GITHUB_REPOSITORY
const sha = process.argv[2]
if (repo !== "ELjayMedia/ticketiv" || !/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Invalid release repository or revision")
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim()
const gh = (path) => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }))
const tree = git("rev-parse", `${sha}^{tree}`)
const deployments = gh(`repos/${repo}/deployments?environment=UAT&per_page=100`)
let tested
for (const deployment of deployments) {
  if (!/^[a-f0-9]{40}$/.test(deployment.sha)) continue
  let candidate
  try { candidate = git("rev-parse", `${deployment.sha}^{tree}`) } catch { continue }
  if (candidate !== tree) continue
  const statuses = gh(`repos/${repo}/deployments/${deployment.id}/statuses?per_page=1`)
  if (statuses[0]?.state === "success") { tested = deployment; break }
}
if (!tested) throw new Error("No successful UAT deployment exists for this exact source tree")
console.log(`Verified UAT deployment ${tested.id}, revision ${tested.sha}, tree ${tree}`)
