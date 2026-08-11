// How to read a push provider's response — pure, so it is provable without a
// network or credentials.
//
// The distinction that matters is not success/failure but **whether the token
// is still worth keeping**. Push providers answer three different questions in
// one HTTP status:
//
//   1. did this send work
//   2. should we try again
//   3. is this registration permanently gone
//
// Conflating 2 and 3 is what produces the two classic failures: retry storms
// against a token that will never work again, and an ever-growing table of dead
// registrations that every future send pays for. Each rail spells "gone"
// differently, so the mapping lives here rather than in three senders.

export type PushService = "fcm" | "apns" | "hms"

export type PushOutcome =
  /** Accepted by the provider. */
  | { kind: "delivered"; ref: string | null }
  /** Transient — provider unavailable, throttled, or a 5xx. Safe to retry. */
  | { kind: "retry"; reason: string }
  /** The registration is permanently gone. Retire the token; never retry. */
  | { kind: "token_dead"; reason: string }
  /** Our fault — malformed payload, bad credentials. Retrying will not help. */
  | { kind: "failed"; reason: string }

export interface ProviderResponse {
  status: number
  /** Parsed body when the provider returned JSON; raw text otherwise. */
  body?: unknown
}

function textOf(body: unknown): string {
  if (typeof body === "string") return body
  if (body && typeof body === "object") {
    try {
      return JSON.stringify(body)
    } catch {
      return ""
    }
  }
  return ""
}

// FCM v1 reports a dead registration as UNREGISTERED, and an ill-formed one as
// INVALID_ARGUMENT on the token field. 404 is also "no such registration".
// https://firebase.google.com/docs/cloud-messaging/manage-tokens
function evaluateFcm(response: ProviderResponse): PushOutcome {
  const body = textOf(response.body)

  if (response.status >= 200 && response.status < 300) {
    const name = extractString(response.body, "name")
    return { kind: "delivered", ref: name }
  }

  if (response.status === 404 || body.includes("UNREGISTERED") || body.includes("NOT_FOUND")) {
    return { kind: "token_dead", reason: "fcm:UNREGISTERED" }
  }

  // A registration token that is not merely stale but structurally wrong will
  // never become valid, so it is dead rather than a payload bug.
  if (response.status === 400 && body.includes("INVALID_ARGUMENT") && /token/i.test(body)) {
    return { kind: "token_dead", reason: "fcm:INVALID_ARGUMENT(token)" }
  }

  if (response.status === 401 || response.status === 403) {
    return { kind: "failed", reason: `fcm:auth(${response.status})` }
  }

  if (response.status === 429 || response.status >= 500) {
    return { kind: "retry", reason: `fcm:transient(${response.status})` }
  }

  return { kind: "failed", reason: `fcm:${response.status}` }
}

// APNs signals a dead device with 410 Unregistered, and BadDeviceToken with 400.
// 403 is a credential problem (bad signing key), not a token problem.
// https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns
function evaluateApns(response: ProviderResponse): PushOutcome {
  const body = textOf(response.body)

  if (response.status === 200) {
    return { kind: "delivered", ref: extractString(response.body, "apns-id") }
  }

  if (response.status === 410 || body.includes("Unregistered")) {
    return { kind: "token_dead", reason: "apns:Unregistered" }
  }

  if (body.includes("BadDeviceToken") || body.includes("DeviceTokenNotForTopic")) {
    return { kind: "token_dead", reason: "apns:BadDeviceToken" }
  }

  if (response.status === 403 || body.includes("ExpiredProviderToken") || body.includes("InvalidProviderToken")) {
    return { kind: "failed", reason: "apns:provider-token" }
  }

  if (response.status === 429 || response.status >= 500) {
    return { kind: "retry", reason: `apns:transient(${response.status})` }
  }

  return { kind: "failed", reason: `apns:${response.status}` }
}

// HMS Push answers 200 with a `code` string in the body, so the HTTP status
// alone says nothing. 80300007 = token invalid, 80300002 = all tokens failed.
// https://developer.huawei.com/consumer/en/doc/HMSCore-References/https-send-api-0000001050986197
const HMS_SUCCESS = "80000000"
const HMS_DEAD_TOKEN = new Set(["80300007", "80300002", "80100003"])
const HMS_TRANSIENT = new Set(["80600003", "81000001"])

function evaluateHms(response: ProviderResponse): PushOutcome {
  const code = extractString(response.body, "code") ?? ""

  if (response.status >= 500) return { kind: "retry", reason: `hms:transient(${response.status})` }

  if (code === HMS_SUCCESS) {
    return { kind: "delivered", ref: extractString(response.body, "requestId") }
  }

  if (HMS_DEAD_TOKEN.has(code)) return { kind: "token_dead", reason: `hms:${code}` }
  if (HMS_TRANSIENT.has(code)) return { kind: "retry", reason: `hms:${code}` }

  if (response.status === 401 || response.status === 403) {
    return { kind: "failed", reason: `hms:auth(${response.status})` }
  }

  return { kind: "failed", reason: code ? `hms:${code}` : `hms:${response.status}` }
}

function extractString(body: unknown, key: string): string | null {
  if (body && typeof body === "object" && key in (body as Record<string, unknown>)) {
    const value = (body as Record<string, unknown>)[key]
    if (typeof value === "string") return value
  }
  return null
}

export function evaluatePushResponse(service: PushService, response: ProviderResponse): PushOutcome {
  switch (service) {
    case "fcm":
      return evaluateFcm(response)
    case "apns":
      return evaluateApns(response)
    case "hms":
      return evaluateHms(response)
  }
}

/**
 * Only a dead registration justifies retiring the stored token.
 *
 * Written as a type predicate so callers that act on it also get the narrowed
 * outcome — the retirement call wants `reason`, and without narrowing it would
 * have to re-check `kind` or reach for a cast.
 */
export function shouldRetireToken(
  outcome: PushOutcome,
): outcome is Extract<PushOutcome, { kind: "token_dead" }> {
  return outcome.kind === "token_dead"
}
