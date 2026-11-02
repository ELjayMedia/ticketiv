import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every organizer workspace page checks the person's role for its section
 * (ADR 0002), either itself or through a section layout above it. Org
 * membership alone (the org layout) is not enough: a scanner must not open
 * finance pages.
 */
const ROOT = join(process.cwd(), "app/orgs/[orgId]")
const GUARD = /require(OrganizerSection|EventManager|OrgManager)\(/

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return pages(path)
    return name === "page.tsx" ? [path] : []
  })
}

function guarded(page: string): boolean {
  const source = readFileSync(page, "utf8")
  if (GUARD.test(source)) return true
  // Retired routes that only redirect are fine.
  if (/^\s*redirect\(/m.test(source) && !/return \(/.test(source)) return true
  for (let dir = dirname(page); dir.startsWith(ROOT) && dir !== ROOT; dir = dirname(dir)) {
    try {
      if (GUARD.test(readFileSync(join(dir, "layout.tsx"), "utf8"))) return true
    } catch {
      // no layout at this level
    }
  }
  return false
}

describe("organizer workspace pages check the role", () => {
  it("every page under /orgs/[orgId] has a section guard", () => {
    const missing = pages(ROOT).filter((page) => !guarded(page)).map((page) => relative(ROOT, page))
    expect(missing).toEqual([])
  })

  it("the old workspace check-in scanner just forwards to /scan", () => {
    const checkin = readFileSync(join(ROOT, "events/[eventId]/checkin/page.tsx"), "utf8")
    expect(checkin).not.toContain("CheckinScanner")
    expect(checkin).toContain("/scanner")
  })

  it("pages finance can open only link to event pages for managers", () => {
    for (const page of ["dashboard/page.tsx", "finance/page.tsx"]) {
      const source = readFileSync(join(ROOT, page), "utf8")
      const eventLinks = source.match(/href=\{`\/orgs\/\$\{orgId\}\/events\/\$\{/g) ?? []
      expect(eventLinks.length, page).toBeGreaterThan(0)
      expect(source, page).toContain('canOpenEvents = ')
      expect(source.split("canOpenEvents ?").length - 1, page).toBeGreaterThanOrEqual(eventLinks.length)
    }
  })
})
