import { test as base, expect } from "@playwright/test"

const UAT_ORIGIN = "https://uat.ticketiv.app"

/** Cloudflare Access service-token headers, only when the suite targets UAT. */
function uatAccessHeaders(): Record<string, string> | null {
  const id = process.env.CLOUDFLARE_ACCESS_CLIENT_ID
  const secret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET
  if (process.env.PLAYWRIGHT_BASE_URL !== UAT_ORIGIN || !id || !secret) return null
  return { "CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret }
}

export const test = base.extend<{ accessGate: void }>({
  accessGate: [async ({ context }, use) => {
    const access = uatAccessHeaders()
    if (access) {
      // Access credentials must never be forwarded to payment providers or other origins.
      await context.route(`${UAT_ORIGIN}/**`, async (route) => {
        const response = await route.fetch({ maxRedirects: 0, headers: { ...route.request().headers(), ...access } })
        await route.fulfill({ response })
      })
    }
    await use()
    // Prefetches still in flight when a test ends must not fail it.
    if (access) await context.unrouteAll({ behavior: "ignoreErrors" })
  }, { auto: true }],

  // API probes (`request`) don't go through context.route, so without this they
  // hit the Access login page (200 HTML) instead of the app. The headers are
  // scoped to the UAT origin by baseURL; tests never pass absolute URLs to
  // other origins through this fixture.
  request: async ({ playwright, baseURL, userAgent }, provide) => {
    const access = uatAccessHeaders()
    if (!access) {
      const ctx = await playwright.request.newContext({ baseURL, userAgent })
      await provide(ctx)
      await ctx.dispose()
      return
    }
    const ctx = await playwright.request.newContext({ baseURL, userAgent, extraHTTPHeaders: access })
    await provide(ctx)
    await ctx.dispose()
  },
})

export { expect }
