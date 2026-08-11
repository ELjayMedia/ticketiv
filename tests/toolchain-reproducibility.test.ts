import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// TICK-345 — "clean installs are deterministic and CI uses the committed
// lockfile" is not a one-off cleanup. It decays every time someone adds a
// dependency, a workspace package or a workflow.
//
// The July audit found `latest` declarations across the manifests; they were
// pinned, and the August re-audit found none. Between those two points the repo
// gained four workspace packages (TICK-328) and two Android workflows, none of
// which existed when the pinning was checked. That is the shape of the problem:
// the check was correct and then the repo grew underneath it.
//
// So these assert the invariants rather than the fix. A floating version, a new
// workflow that installs without the lockfile, or a Node pin that drifts away
// from `engines` all fail here instead of at whatever future moment two
// machines quietly stop agreeing.

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")
const readJson = (file: string) => JSON.parse(read(file))
const rootPkg = () => readJson("package.json")

const MANIFESTS = [
  "package.json",
  "apps/access/package.json",
  "apps/ticketiv/package.json",
  "packages/adapters/package.json",
  "packages/shared/package.json",
  "packages/tokens/package.json",
]

const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const

/**
 * Versions that resolve to "whatever exists at install time".
 *
 * `workspace:*` is deliberately excluded — the `*` there means "the sibling in
 * this repo", which is exactly reproducible, not a floating range.
 */
function isFloating(range: string): boolean {
  const v = range.trim()
  if (v.startsWith("workspace:") || v.startsWith("catalog:") || v.startsWith("link:")) return false
  return v === "" || v === "*" || v === "x" || v === "latest" || v === "next" || v.startsWith("git")
}

describe("dependency declarations", () => {
  it("covers every manifest in the workspace", () => {
    // A package added under apps/ or packages/ without being listed here would
    // otherwise never be checked — which is precisely how the last four escaped
    // the July pinning pass.
    const globbed = ["apps", "packages"].flatMap((dir) =>
      fs
        .readdirSync(path.join(root, dir), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => `${dir}/${e.name}/package.json`)
        .filter((p) => fs.existsSync(path.join(root, p))),
    )

    for (const manifest of globbed) {
      expect(MANIFESTS, `${manifest} is not covered by this test`).toContain(manifest)
    }
  })

  it("declares no floating version anywhere", () => {
    const floating: string[] = []

    for (const manifest of MANIFESTS) {
      const json = readJson(manifest)
      for (const field of DEP_FIELDS) {
        for (const [name, range] of Object.entries((json[field] ?? {}) as Record<string, string>)) {
          if (isFloating(range)) floating.push(`${manifest} → ${field}.${name} = "${range}"`)
        }
      }
    }

    expect(floating, `floating dependency ranges:\n${floating.join("\n")}`).toEqual([])
  })
})

describe("toolchain pinning", () => {
  it("pins pnpm to an exact version via packageManager", () => {
    // corepack reads this in CI, so a range here means CI and a developer's
    // machine can run different pnpm versions against the same lockfile.
    expect(rootPkg().packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/)
  })

  it("declares a supported Node version", () => {
    expect(rootPkg().engines?.node).toBeTruthy()
  })

  it("enforces engines rather than merely stating them", () => {
    // pnpm treats `engines` as advisory unless engine-strict is set: it warns
    // and installs anyway. Verified by mutation — with this line present,
    // setting engines.node to 18.x fails the install with
    // ERR_PNPM_UNSUPPORTED_ENGINE; without it, the same mismatch is a warning.
    expect(fs.existsSync(path.join(root, ".npmrc")), ".npmrc is missing").toBe(true)
    expect(read(".npmrc")).toMatch(/^\s*engine-strict\s*=\s*true\s*$/m)
  })

  it("keeps .nvmrc consistent with engines.node", () => {
    // Two places naming a Node version is a fact; two places naming *different*
    // Node versions is a bug that only shows up on someone else's machine.
    const nvmrc = read(".nvmrc").trim()
    const declared = String(rootPkg().engines.node)

    // Compare majors rather than prefixes: "22.x".startsWith("2") is true, and
    // an .nvmrc of "2" is not a match.
    const nvmrcMajor = nvmrc.match(/^v?(\d+)/)?.[1]
    const declaredMajor = declared.match(/(\d+)/)?.[1]

    expect(nvmrcMajor, `.nvmrc does not name a version: "${nvmrc}"`).toBeDefined()
    expect(nvmrcMajor, `.nvmrc says ${nvmrc}, engines.node says ${declared}`).toBe(declaredMajor)
  })
})

describe("CI install determinism", () => {
  const dir = ".github/workflows"
  const workflows = fs
    .readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => ({ file: `${dir}/${f}`, body: read(`${dir}/${f}`) }))
    .filter(({ body }) => body.includes("pnpm install"))

  it("finds workflows to check", () => {
    // Guards against the checks below passing vacuously if the directory moves.
    expect(workflows.length).toBeGreaterThan(0)
  })

  it("installs only from the committed lockfile", () => {
    // A bare `pnpm install` in CI silently updates the lockfile, so CI stops
    // testing what is committed.
    for (const { file, body } of workflows) {
      const bare = body
        .split("\n")
        .filter((line) => /(^|\s)pnpm install(\s|$)/.test(line) && !line.includes("--frozen-lockfile"))

      expect(bare, `${file} installs without --frozen-lockfile:\n${bare.join("\n")}`).toEqual([])
    }
  })

  it("agrees with engines.node on the Node major", () => {
    const declaredMajor = String(rootPkg().engines.node).match(/\d+/)?.[0]

    for (const { file, body } of workflows) {
      const pins = [...body.matchAll(/node-version:\s*["']?(\d+)/g)].map((m) => m[1])

      expect(pins.length, `${file} installs with pnpm but never pins node-version`).toBeGreaterThan(0)
      for (const pin of pins) {
        expect(pin, `${file} pins Node ${pin}, package.json declares ${declaredMajor}`).toBe(declaredMajor)
      }
    }
  })
})
