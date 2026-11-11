import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")

describe("Coolify deployment contract", () => {
  it("requires a successful health response with an explicit ready body", () => {
    const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8")

    expect(dockerfile).toContain("if(!r.ok)process.exit(1)")
    expect(dockerfile).toContain("body?.ok===true")
    expect(dockerfile).not.toContain("r.status<500")
  })

  it("synchronizes the deployed GitHub revision into Coolify", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8")

    expect(workflow).toContain("SOURCE_COMMIT: ${{ github.sha }}")
    expect(workflow).toContain('--arg source_commit "$SOURCE_COMMIT"')
    expect(workflow).toContain(
      '{key:"SOURCE_COMMIT", value:$source_commit, is_runtime:true, is_buildtime:true, is_shown_once:false}',
    )
  })
})
