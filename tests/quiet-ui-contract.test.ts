import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Quiet UI guard: the app styles itself only through Quiet tokens and the
 * Quiet icon set (see DESIGN_SYSTEM.md). These checks fail when a change
 * reintroduces Tailwind's default palette, hard-coded hex colours, or a
 * second icon library.
 */

const root = process.cwd()
const SCAN_DIRS = ["app", "components"]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(root, dir))).map((path) => ({
  path: relative(root, path),
  source: readFileSync(path, "utf8"),
}))

/** Real brand marks (MTN, Visa, Mastercard) and the macOS window dots in design previews. */
const BRAND_HEX = new Set(["ffcc00", "1a1f71", "f79e1b", "ff5f00", "fc5f57", "fcbb2b", "28c83f"])

const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|decoration|shadow)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
const HEX_CLASS = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|accent|divide|outline|decoration)-\[#([0-9a-fA-F]{3,8})\]/g

function offenders(pattern: RegExp, keep?: (match: RegExpMatchArray) => boolean) {
  return files.flatMap(({ path, source }) =>
    [...source.matchAll(pattern)].filter((m) => !keep || keep(m)).map((m) => `${path}: ${m[0]}`),
  )
}

describe("Quiet UI consistency", () => {
  it("uses Quiet colour tokens instead of Tailwind's default palette", () => {
    expect(offenders(PALETTE_CLASS)).toEqual([])
  })

  it("uses Quiet colour tokens instead of hard-coded hex colours (brand marks excepted)", () => {
    expect(offenders(HEX_CLASS, (m) => !BRAND_HEX.has(m[1].toLowerCase()))).toEqual([])
  })

  it("uses the Quiet icon set only", () => {
    const lucide = files.filter(({ source }) => source.includes('from "lucide-react"')).map(({ path }) => path)
    expect(lucide).toEqual([])
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
    expect(pkg.dependencies?.["lucide-react"]).toBeUndefined()
  })

  it("keeps the RN token package in sync with the web theme status colours", () => {
    const css = readFileSync(join(root, "app/globals.css"), "utf8")
    const tokens = readFileSync(join(root, "packages/tokens/src/index.ts"), "utf8")
    const pairs: Array<[string, string]> = [
      ["--color-warning", "warning"],
      ["--color-warning-soft", "warningSoft"],
      ["--color-success", "success"],
      ["--color-success-soft", "successSoft"],
      ["--color-danger", "danger"],
      ["--color-danger-soft", "dangerSoft"],
    ]
    for (const [cssVar, tokenKey] of pairs) {
      const cssValue = css.match(new RegExp(`${cssVar}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
      const tokenValue = tokens.match(new RegExp(`\\b${tokenKey}:\\s*"(#[0-9a-fA-F]{6})"`))?.[1]
      expect(tokenValue, `${tokenKey} matches ${cssVar}`).toBe(cssValue)
    }
  })
})
