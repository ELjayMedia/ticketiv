#!/usr/bin/env node
// TICK-261 — prove client bundles cannot reach the Supabase service-role boundary.
//
// Next catches many server/client import mistakes at build time, but the
// privileged key deserves its own small invariant: a "use client" module must
// never directly or transitively import the admin Supabase client or env shape.
// Module-level "use server" files are treated as a boundary because client
// components can reference server actions without bundling their implementation.

import { readdirSync, readFileSync } from "node:fs"
import { dirname, extname, join, normalize, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

const SCAN_DIRS = ["app", "components", "hooks", "lib", "packages"]
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]
const IGNORE_DIRS = new Set([".git", ".next", "build", "coverage", "dist", "node_modules", "__tests__"])
const PACKAGE_ALIASES = new Map([
  ["@ticketiv/adapters", "packages/adapters/src/index.ts"],
  ["@ticketiv/shared", "packages/shared/src/index.ts"],
  ["@ticketiv/tokens", "packages/tokens/src/index.ts"],
])

const FORBIDDEN_FILES = new Set([toPath(resolve(root, "lib/supabase/admin.ts"))])
const FORBIDDEN_PATTERNS = [
  { label: "SUPABASE_SERVICE_ROLE_KEY", pattern: /\bSUPABASE_SERVICE_ROLE_KEY\b/ },
  { label: "createAdminClient", pattern: /\bcreateAdminClient\b/ },
  { label: "admin Supabase import", pattern: /@\/lib\/supabase\/admin|lib\/supabase\/admin/ },
  { label: "service_role literal", pattern: /["']service_role["']/ },
]

function toPath(file) {
  return normalize(file)
}

function rel(file) {
  return relative(root, file)
}

function hasSourceExtension(file) {
  return SOURCE_EXTENSIONS.includes(extname(file)) && !file.endsWith(".d.ts")
}

function isTestFile(file) {
  return /\.(test|spec)\.[jt]sx?$/.test(file)
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
      if (!IGNORE_DIRS.has(entry.name)) walkFiles(full, out)
      continue
    }
    if (entry.isFile() && hasSourceExtension(entry.name) && !isTestFile(entry.name)) {
      out.push(toPath(full))
    }
  }
  return out
}

const files = new Map()
for (const dir of SCAN_DIRS) {
  for (const file of walkFiles(join(root, dir))) {
    files.set(file, readFileSync(file, "utf8"))
  }
}

function skipIgnorable(source, index) {
  let i = index
  while (i < source.length) {
    const next = source.slice(i).match(/^\s+/)
    if (next) {
      i += next[0].length
      continue
    }
    if (source.startsWith("//", i)) {
      const newline = source.indexOf("\n", i + 2)
      i = newline === -1 ? source.length : newline + 1
      continue
    }
    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2)
      i = end === -1 ? source.length : end + 2
      continue
    }
    break
  }
  return i
}

function directive(source) {
  const text = source.replace(/^\uFEFF/, "")
  const i = skipIgnorable(text, 0)
  const match = text.slice(i).match(/^["'](use client|use server)["']\s*;?/)
  return match?.[1] ?? null
}

function extractImports(source) {
  const imports = []
  const staticImport = /\b(import|export)\s+(type\s+)?(?:(?:[\s\S]*?)\s+from\s+)?["']([^"']+)["']/g
  const dynamicImport = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  const requireCall = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g

  for (const match of source.matchAll(staticImport)) {
    if (match[2]) continue
    imports.push(match[3])
  }
  for (const match of source.matchAll(dynamicImport)) imports.push(match[1])
  for (const match of source.matchAll(requireCall)) imports.push(match[1])

  return imports
}

function resolvePackageAlias(specifier) {
  const exact = PACKAGE_ALIASES.get(specifier)
  if (exact) return resolve(root, exact)

  for (const [alias, target] of PACKAGE_ALIASES) {
    if (!specifier.startsWith(`${alias}/`)) continue
    const subpath = specifier.slice(alias.length + 1)
    return resolve(root, dirname(target), subpath)
  }
  return null
}

function resolveImport(specifier, importer) {
  let base = null

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = resolve(dirname(importer), specifier)
  } else if (specifier.startsWith("@/")) {
    base = resolve(root, specifier.slice(2))
  } else {
    base = resolvePackageAlias(specifier)
  }

  if (!base) return null
  return resolveFile(base)
}

function resolveFile(base) {
  const exact = toPath(base)
  if (files.has(exact)) return exact

  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = toPath(`${base}${ext}`)
    if (files.has(candidate)) return candidate
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = toPath(join(base, `index${ext}`))
    if (files.has(candidate)) return candidate
  }

  return null
}

function forbiddenReasons(file, source) {
  const reasons = []
  if (FORBIDDEN_FILES.has(file)) reasons.push("reaches lib/supabase/admin.ts")

  for (const { label, pattern } of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) reasons.push(`contains ${label}`)
  }

  return reasons
}

function addViolation(violations, reason, file, chain) {
  const key = `${file}::${reason}`
  const existing = violations.get(key) ?? { reason, file, chains: [] }
  existing.chains.push(chain)
  violations.set(key, existing)
}

function scanFromClientEntry(entry, violations) {
  const stack = [{ file: entry, chain: [entry] }]
  const seen = new Set()

  while (stack.length) {
    const { file, chain } = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)

    const source = files.get(file)
    if (!source) continue

    if (file !== entry && directive(source) === "use server") {
      continue
    }

    for (const reason of forbiddenReasons(file, source)) {
      addViolation(violations, reason, file, chain)
    }

    for (const specifier of extractImports(source)) {
      if (specifier === "server-only") {
        addViolation(violations, "imports server-only", file, chain)
        continue
      }

      const resolved = resolveImport(specifier, file)
      if (!resolved || seen.has(resolved)) continue
      stack.push({ file: resolved, chain: [...chain, resolved] })
    }
  }
}

const clientEntries = [...files.entries()]
  .filter(([, source]) => directive(source) === "use client")
  .map(([file]) => file)

const violations = new Map()
for (const entry of clientEntries) {
  scanFromClientEntry(entry, violations)
}

if (violations.size === 0) {
  console.log(`Service-role boundary passed across ${clientEntries.length} client entry module(s).`)
  process.exit(0)
}

console.error(`Service-role boundary failed across ${clientEntries.length} client entry module(s):\n`)
for (const { reason, file, chains } of [...violations.values()].sort((a, b) => rel(a.file).localeCompare(rel(b.file)))) {
  console.error(`  - ${rel(file)} ${reason}`)
  for (const chain of chains.slice(0, 3)) {
    console.error(`      via ${chain.map(rel).join(" -> ")}`)
  }
  if (chains.length > 3) console.error(`      ...and ${chains.length - 3} more path(s)`)
}

console.error(
  "\nMove the privileged code behind a module-level \"use server\" action, route handler, " +
    "or server component boundary before importing it from client UI.",
)
process.exit(1)
