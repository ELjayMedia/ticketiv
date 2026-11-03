import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A server component may render components from a "use client" file, but it
 * can't call other functions exported from one: Next.js turns them into client
 * references and the page fails with a 500 ("Attempted to call X() from the
 * server"). This broke /orgs/[orgId]/payouts/accounts once (providerLabel).
 */
const ROOT = process.cwd()

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files(path, out)
    else if (/^(page|layout)\.tsx$/.test(name)) out.push(path)
  }
  return out
}

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(ROOT, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null
  if (!base) return null
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

const isClient = (source: string) => /^\s*["']use client["']/.test(source)

describe("server pages only render (never call) client-module exports", () => {
  it("imports from \"use client\" files in server pages and layouts are components", () => {
    const problems: string[] = []
    for (const page of files(join(ROOT, "app"))) {
      const source = readFileSync(page, "utf8")
      if (isClient(source)) continue
      for (const match of source.matchAll(/import\s+(?!type\b)\{([^}]+)\}\s+from\s+["']([^"']+)["']/g)) {
        const target = resolveImport(page, match[2])
        if (!target || !isClient(readFileSync(target, "utf8"))) continue
        for (const raw of match[1].split(",")) {
          const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()!.trim()
          if (name && !raw.trim().startsWith("type ") && !/^[A-Z]/.test(name)) {
            problems.push(`${page.replace(`${ROOT}/`, "")} calls ${name} from client module ${match[2]}`)
          }
        }
      }
    }
    expect(problems).toEqual([])
  })
})
