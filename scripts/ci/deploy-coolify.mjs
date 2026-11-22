import { appendFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const API = "https://coolify.eljaymedia.com/api/v1"
const IMAGE = "ghcr.io/eljaymedia/ticketiv"
export const TARGETS = {
  uat: { branch: "uat", kind: "services", resource: "f6zklydyif1ob3kk2dkvrnjn", url: "https://uat.ticketiv.app" },
  production: { branch: "main", kind: "applications", resource: "zs2jkfesdsmrrftkjgcnoekp", url: "https://ticketiv.app" },
}

export function validateRelease(environment, digest, revision, branch) {
  const target = TARGETS[environment]
  if (!target || branch !== target.branch) throw new Error("Deployment branch does not match its environment")
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error("An immutable SHA-256 image digest is required")
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("A full Git commit SHA is required")
  return { ...target, environment, digest, revision, image: `${IMAGE}@${digest}` }
}

export function patchUatCompose(raw, image, revision) {
  const lines = raw.split("\n")
  const images = lines.map((line, index) => /^\s*image:/.test(line) ? index : -1).filter((index) => index >= 0)
  if (images.length !== 1) throw new Error("UAT frontend must contain exactly one image")
  const i = images[0]
  if (!/^\s*image:\s*['"]?(ticketiv-uat:|ghcr\.io\/eljaymedia\/ticketiv[:@])/.test(lines[i])) throw new Error("Unexpected UAT frontend image repository")
  lines[i] = `${lines[i].match(/^\s*/)[0]}image: ${image}`
  const commits = lines.map((line, index) => /^\s*-\s*SOURCE_COMMIT=/.test(line) ? index : -1).filter((index) => index >= 0)
  if (commits.length !== 1) throw new Error("UAT frontend revision marker is missing or ambiguous")
  lines[commits[0]] = lines[commits[0]].replace(/SOURCE_COMMIT=.*/, `SOURCE_COMMIT=${revision}`)
  return lines.join("\n").replace(/^(\s*pull_policy:)\s*never\s*$/m, "$1 if_not_present")
}

export async function deployRelease(release, { api, health, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 60 }) {
  const path = `/${release.kind}/${release.resource}`
  const previous = await api(path)
  const before = await health(release.url).catch(() => null)
  const previousRevision = before?.revision
  if (!previousRevision || !/^[a-f0-9]{40}$/.test(previousRevision)) throw new Error("Cannot establish a known revision for automatic rollback")
  const rollback = release.environment === "uat"
    ? { docker_compose_raw: Buffer.from(previous.docker_compose_raw).toString("base64") }
    : { docker_registry_image_name: previous.docker_registry_image_name, docker_registry_image_tag: previous.docker_registry_image_tag }

  async function setRevision(revision) {
    if (release.environment === "production") await api(`${path}/envs/bulk`, "PATCH", { data: [{ key: "SOURCE_COMMIT", value: revision, is_runtime: true, is_buildtime: false }] })
  }
  async function restart() {
    if (release.environment === "uat") return api(`${path}/restart`, "POST", { latest: true })
    const result = await api("/deploy", "POST", { uuid: release.resource, force: false })
    const id = result.deployments?.[0]?.deployment_uuid
    if (!id) throw new Error("Coolify did not queue the deployment")
    for (let n = 0; n < attempts; n++) {
      const state = await api(`/deployments/${id}`)
      if (state.status === "finished") return
      if (state.status === "failed" || state.status?.startsWith("cancelled")) throw new Error("Coolify deployment failed")
      await pause(10_000)
    }
    throw new Error("Coolify deployment timed out")
  }
  async function ready(revision) {
    for (let n = 0; n < attempts; n++) {
      try {
        const result = await health(release.url)
        if (result.ok === true && result.revision === revision) return
      } catch { /* The previous instance may be stopping. */ }
      await pause(10_000)
    }
    throw new Error("The exact release revision did not become healthy")
  }
  const desired = release.environment === "uat"
    ? { docker_compose_raw: Buffer.from(patchUatCompose(previous.docker_compose_raw, release.image, release.revision)).toString("base64") }
    : { docker_registry_image_name: IMAGE, docker_registry_image_tag: release.digest.replace("sha256:", "sha256-") }
  try {
    await api(path, "PATCH", desired)
    await setRevision(release.revision)
    const actual = await api(path)
    if (release.environment === "uat") {
      if (!actual.docker_compose_raw?.includes(`image: ${release.image}`)) throw new Error("Coolify did not retain the requested image digest")
    } else if (actual.docker_registry_image_name !== IMAGE || actual.docker_registry_image_tag !== desired.docker_registry_image_tag) throw new Error("Coolify did not retain the requested image digest")
    await restart()
    await ready(release.revision)
    return { environment: release.environment, image: release.image, revision: release.revision, previousRevision }
  } catch (cause) {
    try {
      await api(path, "PATCH", rollback)
      await setRevision(previousRevision)
      await restart()
      await ready(previousRevision)
    } catch {
      throw new Error("Deployment failed and automatic rollback needs operator attention", { cause })
    }
    throw new Error("Deployment failed; the previous healthy revision was restored", { cause })
  }
}

async function main() {
  const [environment, digest, revision] = process.argv.slice(2)
  const release = validateRelease(environment, digest, revision, process.env.GITHUB_REF_NAME)
  const token = process.env.COOLIFY_TOKEN
  const clientId = process.env.CLOUDFLARE_ACCESS_CLIENT_ID
  const clientSecret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET
  if (!token || !clientId || !clientSecret) throw new Error("Missing environment-scoped deployment credentials")
  const access = { "CF-Access-Client-Id": clientId, "CF-Access-Client-Secret": clientSecret }
  async function request(url, method = "GET", data, headers = {}) {
    const response = await fetch(url, { method, redirect: "error", signal: AbortSignal.timeout(30_000), headers: { ...headers, "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) })
    if (!response.ok) throw new Error(`Deployment API returned HTTP ${response.status}`)
    return response.json()
  }
  const result = await deployRelease(release, {
    api: (path, method, data) => request(API + path, method, data, { ...access, Authorization: `Bearer ${token}` }),
    health: (url) => request(url + "/api/health", "GET", undefined, url === TARGETS.uat.url ? access : {}),
  })
  console.log(JSON.stringify(result))
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### ${environment} deployed\n- Revision: ${revision}\n- Image: ${result.image}\n- Previous revision: ${result.previousRevision}\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
