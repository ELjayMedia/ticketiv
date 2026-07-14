import { describe, expect, it } from "vitest"

import {
  buildTapBandTelemetryRow,
  evaluateTapBandTelemetrySignals,
  hashTelemetryIdentifier,
  sanitizeTelemetryMetadata,
  type TapBandTelemetrySignal,
} from "@/lib/tapband/telemetry"

describe("tapband telemetry", () => {
  it("hashes identifiers consistently with the same salt", () => {
    expect(hashTelemetryIdentifier("band-123", "salt-a")).toBe(hashTelemetryIdentifier("band-123", "salt-a"))
    expect(hashTelemetryIdentifier("band-123", "salt-a")).not.toBe(hashTelemetryIdentifier("band-123", "salt-b"))
  })

  it("redacts sensitive metadata keys while keeping operational fields", () => {
    const sanitized = sanitizeTelemetryMetadata({
      batch: "pilot-a",
      buyerEmail: "buyer@example.com",
      nested: {
        phone: "+26876000000",
        reason: "unsupported_chip",
      },
    })

    expect(sanitized.batch).toBe("pilot-a")
    expect(sanitized.buyerEmail).toBe("[redacted]")
    expect(sanitized.nested).toEqual({ phone: "[redacted]", reason: "unsupported_chip" })
  })

  it("builds a privacy-minimised insert row", () => {
    const row = buildTapBandTelemetryRow({
      eventType: "credential_auth_failure",
      severity: "warning",
      credentialId: "raw-band-id",
      serial: "TB-0001",
      latencyMs: 12.9,
      metadata: { token: "secret", batch: "pilot-a" },
      occurredAt: "2026-07-14T20:00:00.000Z",
    })

    expect(row.event_type).toBe("credential_auth_failure")
    expect(row.credential_hash).toHaveLength(64)
    expect(row.serial_hash).toHaveLength(64)
    expect(row.latency_ms).toBe(12)
    expect(row.metadata).toEqual({ token: "[redacted]", batch: "pilot-a" })
  })

  it("alerts on repeated authentication failures and reader errors", () => {
    const signals: TapBandTelemetrySignal[] = [
      signal("credential_auth_failure", { credential_hash: "cred-a" }),
      signal("credential_auth_failure", { credential_hash: "cred-a" }),
      signal("reader_error", { device_id: "device-a" }),
      signal("reader_error", { device_id: "device-a" }),
    ]

    const checks = evaluateTapBandTelemetrySignals(signals, {
      repeatedAuthFailures: 2,
      readerErrors: 2,
      serialEnumerationFailures: 10,
      duplicateAdmissionAttempts: 10,
    })

    expect(checks.find((check) => check.key === "tapband-repeated-auth-failures")?.status).toBe("alert")
    expect(checks.find((check) => check.key === "tapband-reader-errors")?.status).toBe("alert")
  })
})

function signal(
  eventType: string,
  overrides: Partial<TapBandTelemetrySignal> = {},
): TapBandTelemetrySignal {
  return {
    event_type: eventType,
    severity: "warning",
    outcome: null,
    occurred_at: "2026-07-14T20:00:00.000Z",
    ...overrides,
  }
}
