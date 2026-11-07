import { describe, expect, it } from "vitest"

import { sameOriginReturnUrl } from "../return-url"

const APP = "https://ticketiv.app"

describe("sameOriginReturnUrl", () => {
  it("keeps same-origin absolute URLs and paths", () => {
    expect(sameOriginReturnUrl("https://ticketiv.app/orders/1/confirmation", APP)).toBe(
      "https://ticketiv.app/orders/1/confirmation",
    )
    expect(sameOriginReturnUrl("/orders/1/confirmation?x=1", APP)).toBe("https://ticketiv.app/orders/1/confirmation?x=1")
  })

  it.each([
    "https://evil.example/orders/1",
    "//evil.example/orders/1",
    "https://ticketiv.app.evil.example/",
    "http://ticketiv.app/orders/1",
    "javascript:alert(1)",
    "https://user:pass@ticketiv.app/",
    "",
    "   ",
  ])("rejects %s", (value) => {
    expect(sameOriginReturnUrl(value, APP)).toBeNull()
  })

  it("returns null when there is nothing to check", () => {
    expect(sameOriginReturnUrl(null, APP)).toBeNull()
    expect(sameOriginReturnUrl(undefined, APP)).toBeNull()
  })
})
