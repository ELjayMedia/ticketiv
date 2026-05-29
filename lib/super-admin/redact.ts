/**
 * Redaction for admin investigation views. Provider payloads (Paystack &c.)
 * and internal job payloads can carry authorization codes, card metadata,
 * signatures, tokens and buyer PII. Admins need the *shape* and the useful
 * debugging fields (status, reference, amount, gateway message) but must not
 * see secrets — so we deep-clone and mask any value whose key looks sensitive.
 */

const SENSITIVE_KEY_PATTERN =
  /(authorization|auth_|_auth|\bauth\b|signature|secret|token|bearer|password|\bpan\b|card|cvv|cvc|\bpin\b|\botp\b|account_number|\biban\b|routing|bank|api[_-]?key|\bkey\b|private)/i

const REDACTED = "[redacted]"
const MAX_DEPTH = 6

export function redactSensitive<T>(value: T, depth = 0): T {
  if (value === null || value === undefined) return value
  if (depth >= MAX_DEPTH) return ("[truncated]" as unknown) as T

  if (Array.isArray(value)) {
    return value.map((v) => redactSensitive(v, depth + 1)) as unknown as T
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = REDACTED
      } else {
        out[key] = redactSensitive(v, depth + 1)
      }
    }
    return out as unknown as T
  }

  return value
}

/** Pretty-print a payload with sensitive fields masked, for a <pre> block. */
export function redactedJson(value: unknown): string {
  try {
    return JSON.stringify(redactSensitive(value), null, 2)
  } catch {
    return "[unserializable payload]"
  }
}
