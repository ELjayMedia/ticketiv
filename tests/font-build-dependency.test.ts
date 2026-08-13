import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const layout = readFileSync(join(root, "app/layout.tsx"), "utf8")
const globals = readFileSync(join(root, "app/globals.css"), "utf8")
const packageJson = readFileSync(join(root, "package.json"), "utf8")

describe("root font build dependencies", () => {
  it("bundles the existing font families without a build-time Google request", () => {
    expect(layout).not.toContain("next/font/google")
    expect(layout).toContain('@fontsource-variable/inter-tight/wght.css')
    expect(layout).toContain('@fontsource-variable/jetbrains-mono/wght.css')
    expect(globals).toContain('"Inter Tight Variable"')
    expect(globals).toContain('"JetBrains Mono Variable"')
  })

  it("pins the local font packages", () => {
    const manifest = JSON.parse(packageJson) as { dependencies?: Record<string, string> }

    expect(manifest.dependencies?.["@fontsource-variable/inter-tight"]).toBe("5.3.0")
    expect(manifest.dependencies?.["@fontsource-variable/jetbrains-mono"]).toBe("5.3.0")
  })
})
