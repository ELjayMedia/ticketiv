import { test as base, expect } from "@playwright/test"

export const test = base.extend<{ accessGate: void }>({
  accessGate: [async ({ context }, use) => {
    const id = process.env.CLOUDFLARE_ACCESS_CLIENT_ID
    const secret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET
    if (process.env.PLAYWRIGHT_BASE_URL === "https://uat.ticketiv.app" && id && secret) {
      // Access credentials must never be forwarded to payment providers or other origins.
      await context.route("https://uat.ticketiv.app/**", async (route) => {
        const response = await route.fetch({
          maxRedirects: 0,
          headers: { ...route.request().headers(), "CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret },
        })
        await route.fulfill({ response })
      })
    }
    await use()
  }, { auto: true }],
})

export { expect }
