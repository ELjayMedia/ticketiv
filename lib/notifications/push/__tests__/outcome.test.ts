import { describe, expect, it } from "vitest"

import { evaluatePushResponse, shouldRetireToken } from "@/lib/notifications/push/outcome"

// TICK-324 — the question these answer is not "did the send work" but "is this
// token still worth keeping".
//
// Getting it wrong is expensive in two directions. Treat a permanently dead
// registration as retryable and every future send burns a request on a token
// that will never work again. Treat a throttle or a 5xx as death and real
// devices get silently unsubscribed — the user simply stops receiving
// notifications and nothing looks broken.

describe("FCM", () => {
  it("reads a 200 as delivered and keeps the message name", () => {
    const out = evaluatePushResponse("fcm", {
      status: 200,
      body: { name: "projects/ticketiv/messages/0:123" },
    })
    expect(out).toEqual({ kind: "delivered", ref: "projects/ticketiv/messages/0:123" })
  })

  it("retires an UNREGISTERED token", () => {
    const out = evaluatePushResponse("fcm", {
      status: 404,
      body: { error: { status: "NOT_FOUND", message: "Requested entity was not found." } },
    })
    expect(out.kind).toBe("token_dead")
    expect(shouldRetireToken(out)).toBe(true)
  })

  it("retires a structurally invalid token but not a bad payload", () => {
    const badToken = evaluatePushResponse("fcm", {
      status: 400,
      body: { error: { status: "INVALID_ARGUMENT", message: "The registration token is not a valid FCM token" } },
    })
    expect(badToken.kind).toBe("token_dead")

    const badPayload = evaluatePushResponse("fcm", {
      status: 400,
      body: { error: { status: "INVALID_ARGUMENT", message: "Invalid value at 'message.notification'" } },
    })
    expect(badPayload.kind).toBe("failed")
    expect(shouldRetireToken(badPayload)).toBe(false)
  })

  it("treats throttling and 5xx as retryable, never as death", () => {
    for (const status of [429, 500, 503]) {
      const out = evaluatePushResponse("fcm", { status })
      expect(out.kind, `status ${status}`).toBe("retry")
      expect(shouldRetireToken(out)).toBe(false)
    }
  })

  it("treats a credential problem as our fault, not the device's", () => {
    const out = evaluatePushResponse("fcm", { status: 401 })
    expect(out.kind).toBe("failed")
    expect(shouldRetireToken(out)).toBe(false)
  })
})

describe("APNs", () => {
  it("reads a 200 as delivered", () => {
    expect(evaluatePushResponse("apns", { status: 200, body: {} }).kind).toBe("delivered")
  })

  it("retires on 410 Unregistered and on BadDeviceToken", () => {
    expect(evaluatePushResponse("apns", { status: 410, body: { reason: "Unregistered" } }).kind).toBe("token_dead")
    expect(evaluatePushResponse("apns", { status: 400, body: { reason: "BadDeviceToken" } }).kind).toBe("token_dead")
  })

  it("does not retire on an expired signing key — that is our credential", () => {
    // 403 ExpiredProviderToken would otherwise wipe every registration at once.
    const out = evaluatePushResponse("apns", { status: 403, body: { reason: "ExpiredProviderToken" } })
    expect(out.kind).toBe("failed")
    expect(shouldRetireToken(out)).toBe(false)
  })

  it("treats 429 and 5xx as retryable", () => {
    expect(evaluatePushResponse("apns", { status: 429, body: { reason: "TooManyRequests" } }).kind).toBe("retry")
    expect(evaluatePushResponse("apns", { status: 503, body: {} }).kind).toBe("retry")
  })
})

describe("HMS", () => {
  it("does not trust the HTTP status — success is a body code", () => {
    // HMS answers 200 for failures too, so reading the status alone would count
    // every rejection as delivered.
    const ok = evaluatePushResponse("hms", { status: 200, body: { code: "80000000", requestId: "req-1" } })
    expect(ok).toEqual({ kind: "delivered", ref: "req-1" })

    const dead = evaluatePushResponse("hms", { status: 200, body: { code: "80300007" } })
    expect(dead.kind).toBe("token_dead")

    const failed = evaluatePushResponse("hms", { status: 200, body: { code: "80100001" } })
    expect(failed.kind).toBe("failed")
  })

  it("treats documented transient codes as retryable", () => {
    expect(evaluatePushResponse("hms", { status: 200, body: { code: "80600003" } }).kind).toBe("retry")
    expect(evaluatePushResponse("hms", { status: 503, body: {} }).kind).toBe("retry")
  })
})

describe("shouldRetireToken", () => {
  it("retires only on token_dead", () => {
    expect(shouldRetireToken({ kind: "token_dead", reason: "x" })).toBe(true)
    expect(shouldRetireToken({ kind: "delivered", ref: null })).toBe(false)
    expect(shouldRetireToken({ kind: "retry", reason: "x" })).toBe(false)
    expect(shouldRetireToken({ kind: "failed", reason: "x" })).toBe(false)
  })
})
