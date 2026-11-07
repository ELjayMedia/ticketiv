import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { POST as sendNotification } from "@/app/api/notifications/send/route"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe("server API authorization boundaries", () => {
  it("never relies on the cookie-backed getSession() result for server authorization", () => {
    const unsafe = sourceFiles(join(root, "app")).filter((path) => {
      const source = readFileSync(path, "utf8")
      return !/^\s*["']use client["']/.test(source) && /\.auth\.getSession\s*\(/.test(source)
    })
    expect(unsafe).toEqual([])
  })

  it("retires the arbitrary-recipient notification API", async () => {
    const response = await sendNotification()
    expect(response.status).toBe(410)
    expect(await response.json()).toEqual({ error: "Notification endpoint retired" })
  })

  it("retires the service-role notification Edge Function too", () => {
    const source = readFileSync(join(root, "supabase", "functions", "send-notification", "index.ts"), "utf8")
    expect(source).toContain("status: 410")
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  })
})
