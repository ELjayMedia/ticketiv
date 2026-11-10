import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { chatwootSdkUrl, chatwootWidgetConfig } from "@/lib/support/chatwoot-widget-core"

describe("Chatwoot support widget", () => {
  it("accepts a secure website inbox configuration", () => {
    const config = chatwootWidgetConfig("https://chat.example.com/app/", "abcdefghijklmnop")
    expect(config).toEqual({ baseUrl: "https://chat.example.com", websiteToken: "abcdefghijklmnop" })
    expect(chatwootSdkUrl(config!)).toBe("https://chat.example.com/packs/js/sdk.js")
  })

  it("rejects missing, malformed, and insecure settings", () => {
    expect(chatwootWidgetConfig(undefined, undefined)).toBeNull()
    expect(chatwootWidgetConfig("http://chat.example.com", "abcdefghijklmnop")).toBeNull()
    expect(chatwootWidgetConfig("https://chat.example.com", "short")).toBeNull()
  })

  it("keeps agent credentials out of the public support surface", () => {
    const page = readFileSync(resolve(process.cwd(), "app/(consumer)/support/page.tsx"), "utf8")
    const widget = readFileSync(resolve(process.cwd(), "components/quiet/screens/support/support-chat.tsx"), "utf8")
    expect(page).toContain("NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN")
    expect(page + widget).not.toContain("CHATWOOT_API_TOKEN")
    expect(widget).toContain("hideMessageBubble: true")
    expect(widget).toContain('window.$chatwoot.toggle("open")')
  })

  it("allows only the required Chatwoot origins in the report-only CSP", () => {
    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"))
    const headers = vercel.headers[0].headers as Array<{ key: string; value: string }>
    const policy = headers.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value ?? ""
    expect(policy).toContain("script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://*.posthog.com https://chat.eljaymedia.com;")
    expect(policy).toContain("https://chat.eljaymedia.com wss://chat.eljaymedia.com;")
    expect(policy).toContain("frame-src 'self' https://www.google.com https://chat.eljaymedia.com;")
  })
})
