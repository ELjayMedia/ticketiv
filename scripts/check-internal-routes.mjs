// TICK-349 — prove every visible link lands somewhere real.
//
// Walks the App Router tree to build the set of routes that actually exist,
// then extracts every static internal href from the codebase and asserts each
// one matches. A link to a route nobody ever created is a 404 the moment a
// user taps it, and nothing in lint, typecheck or the build catches it.
//
// Usage:
//   node scripts/check-internal-routes.mjs          # report and fail on dead links
//   node scripts/check-internal-routes.mjs --list   # also print the route table
//
// Scope and limits, stated plainly:
//   * Only STATIC hrefs are checked -- `href="/friends"`. Template literals
//     like `href={`/events/${id}`}` are skipped, because their shape is only
//     known at runtime. Those are covered by the dynamic-segment matching
//     below when a static prefix happens to be written out, and otherwise
//     belong to the navigation smoke tests in TICK-349's later phases.
//   * Route groups -- (consumer), (app), (auth) -- do not appear in URLs and
//     are stripped, which is exactly the trap that makes this class of bug
//     hard to spot by reading: app/(auth)/login serves /login.
//   * A dynamic segment [id] matches any single path part; [...slug] matches
//     the rest. So /events/123 matches app/events/[id].

import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const APP_DIR = join(root, "app")
const SCAN_DIRS = ["app", "components", "lib", "hooks"]

// Routes that exist outside the App Router or are served by other means.
const KNOWN_EXTERNAL = new Set(["/", "/api", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"])

/** Collect URL paths from the App Router tree. */
function collectRoutes(dir, urlParts = [], out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }

  const hasPage = entries.some((e) => e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name))
  const hasRoute = entries.some((e) => e.isFile() && /^route\.(tsx|ts|jsx|js)$/.test(e.name))
  if (hasPage || hasRoute) out.push("/" + urlParts.join("/"))

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (name.startsWith("_") || name === "node_modules") continue

    // Route groups (x) and parallel routes @x contribute no URL segment.
    const isGroup = name.startsWith("(") && name.endsWith(")")
    const isParallel = name.startsWith("@")
    const next = isGroup || isParallel ? urlParts : [...urlParts, name]
    collectRoutes(join(dir, name), next, out)
  }
  return out
}

/** Turn a route path into a matcher. */
function toMatcher(route) {
  const parts = route.split("/").filter(Boolean)
  return (targetParts) => {
    let i = 0
    for (const part of parts) {
      if (/^\[\.\.\..+\]$/.test(part)) return true // catch-all swallows the rest
      if (i >= targetParts.length) return false
      // [id] matches exactly one segment, anything else must match literally.
      if (!/^\[.+\]$/.test(part) && part !== targetParts[i]) return false
      i += 1
    }
    return i === targetParts.length
  }
}

function walkFiles(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue
      walkFiles(full, out)
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * This project still serves a few routes from the legacy Pages Router
 * (pages/events.tsx and friends), which the App Router walk above cannot see.
 * Missing these produced a false "dead link" for /events on the first run.
 */
function collectPagesRoutes(dir, urlParts = [], out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name.startsWith("_")) continue
      collectPagesRoutes(full, [...urlParts, entry.name], out)
      continue
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) continue
    if (entry.name.startsWith("_")) continue
    const base = entry.name.replace(/\.(tsx|ts|jsx|js)$/, "")
    out.push("/" + [...urlParts, ...(base === "index" ? [] : [base])].join("/"))
  }
  return out
}

const routes = [...collectRoutes(APP_DIR), ...collectPagesRoutes(join(root, "pages"))]
const matchers = routes.map((r) => ({ route: r, match: toMatcher(r) }))

if (process.argv.includes("--list")) {
  console.log(`${routes.length} routes:`)
  for (const r of [...routes].sort()) console.log("  " + r)
  console.log()
}

// Static internal hrefs only: href="/..." and router.push("/...").
const HREF = /(?:href|action)=\{?"(\/[^"{}]*)"|router\.(?:push|replace)\("(\/[^"{}]*)"/g

const dead = new Map()
let checked = 0

for (const dir of SCAN_DIRS) {
  for (const file of walkFiles(join(root, dir))) {
    const source = readFileSync(file, "utf8")
    for (const m of source.matchAll(HREF)) {
      const raw = m[1] ?? m[2]
      if (!raw) continue

      // Strip query and hash — routing only cares about the path.
      const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/"
      if (KNOWN_EXTERNAL.has(path) || path.startsWith("/api/")) continue

      checked += 1
      const parts = path.split("/").filter(Boolean)
      if (matchers.some(({ match }) => match(parts))) continue

      const rel = file.slice(root.length + 1)
      if (!dead.has(path)) dead.set(path, new Set())
      dead.get(path).add(rel)
    }
  }
}

console.log(`Checked ${checked} static internal link(s) against ${routes.length} routes.`)

if (dead.size === 0) {
  console.log("No dead internal links.")
  process.exit(0)
}

console.error(`\n${dead.size} link target(s) have no matching route:\n`)
for (const [path, files] of [...dead.entries()].sort()) {
  console.error(`  ${path}`)
  for (const f of [...files].sort()) console.error(`      ${f}`)
}
console.error(
  "\nEither create the route, fix the link, or make the control non-interactive " +
    "and labelled as unavailable. A visible action must not end in a 404.",
)
process.exit(1)
