import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const protectedLayout = readFileSync(join(root, "app/super-admin/layout.tsx"), "utf8")
const publicLoginPage = join(root, "app/(auth)/super-admin/login/page.tsx")
const protectedLoginPage = join(root, "app/super-admin/login/page.tsx")

describe("super-admin login route boundary", () => {
  it("keeps the login page outside the protected super-admin layout", () => {
    expect(protectedLayout).toContain("requireSuperAdmin()")
    expect(existsSync(publicLoginPage)).toBe(true)
    expect(existsSync(protectedLoginPage)).toBe(false)
  })
})
