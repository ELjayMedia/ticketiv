import { describe, expect, it } from "vitest"

import {
  assertTapBandLifecycleOk,
  createTapBandLifecycleService,
  normalizeTapBandLifecycleResult,
  tapBandLifecycleHttpStatus,
  TapBandLifecycleError,
} from "@/lib/tapband/lifecycle"

describe("tapband lifecycle", () => {
  it("issues credentials through the service-role RPC and normalizes the result", async () => {
    const { client, calls } = fakeRpcClient({
      ok: true,
      status: "issued",
      credential_id: "credential-1",
      inventory_id: "inventory-1",
      idempotent: false,
    })
    const service = createTapBandLifecycleService(client, { telemetryEnabled: false })

    const result = await service.issueCredential({
      inventoryId: "inventory-1",
      userId: "user-1",
      credentialPublicId: "TB-0001",
      actorId: "admin-1",
      deviceId: "device-1",
      sessionId: "session-1",
      attemptId: "attempt-1",
      metadata: { batch: "pilot-a" },
    })

    expect(calls).toEqual([
      {
        functionName: "fn_tapband_issue_credential",
        args: {
          p_inventory_id: "inventory-1",
          p_user_id: "user-1",
          p_credential_public_id: "TB-0001",
          p_actor_id: "admin-1",
          p_device_id: "device-1",
          p_session_id: "session-1",
          p_attempt_id: "attempt-1",
          p_metadata: { batch: "pilot-a" },
        },
      },
    ])
    expect(result.ok).toBe(true)
    expect(result.credentialId).toBe("credential-1")
    expect(result.inventoryId).toBe("inventory-1")
  })

  it("resolves credential scans with scanner context", async () => {
    const { client, calls } = fakeRpcClient({
      ok: true,
      valid: true,
      outcome: "valid",
      reason_code: "tapband_valid_entitlement",
      credential_id: "credential-1",
      order_item_id: "order-item-1",
      scan_id: "scan-1",
      checked_in_at: "2026-07-15T08:00:00.000Z",
    })
    const service = createTapBandLifecycleService(client, { telemetryEnabled: false })

    const result = await service.resolveCredentialForEvent({
      credentialPublicId: "TB-0001",
      eventId: "event-1",
      actorId: "scanner-1",
      deviceId: "device-1",
      sessionId: "session-1",
      attemptId: "attempt-1",
    })

    expect(calls[0]).toEqual({
      functionName: "fn_tapband_resolve_credential_for_event",
      args: {
        p_credential_public_id: "TB-0001",
        p_event_id: "event-1",
        p_actor_id: "scanner-1",
        p_device_id: "device-1",
        p_session_id: "session-1",
        p_attempt_id: "attempt-1",
        p_gate: null,
        p_scanned_at: null,
      },
    })
    expect(result.valid).toBe(true)
    expect(result.reasonCode).toBe("tapband_valid_entitlement")
    expect(result.orderItemId).toBe("order-item-1")
    expect(result.scanId).toBe("scan-1")
    expect(result.checkedInAt).toBe("2026-07-15T08:00:00.000Z")
  })

  it("throws a typed lifecycle error for rejected lifecycle decisions", () => {
    const result = normalizeTapBandLifecycleResult({
      ok: false,
      reason_code: "tapband_unauthorized",
      message: "Not authorized",
    })

    expect(() => assertTapBandLifecycleOk(result)).toThrow(TapBandLifecycleError)

    try {
      assertTapBandLifecycleOk(result)
    } catch (error) {
      expect(error).toBeInstanceOf(TapBandLifecycleError)
      expect((error as TapBandLifecycleError).status).toBe(403)
      expect((error as TapBandLifecycleError).reasonCode).toBe("tapband_unauthorized")
    }
  })

  it("maps RPC transport errors to a 500 lifecycle error", async () => {
    const { client } = fakeRpcClient(null, { message: "permission denied for function" })
    const service = createTapBandLifecycleService(client, { telemetryEnabled: false })

    await expect(
      service.activateCredential({
        credentialId: "credential-1",
        actorId: "user-1",
      }),
    ).rejects.toMatchObject({
      status: 500,
      reasonCode: "tapband_rpc_error",
    })
  })

  it("normalizes customer credential lists without leaking raw-only naming to callers", async () => {
    const { client } = fakeRpcClient([
      {
        credential_id: "credential-1",
        credential_public_id: "TB-0001",
        inventory_id: "inventory-1",
        status: "active",
        credential_type: "desfire_ev3",
        chip_family: "DESFire EV3",
        key_version: "kv1",
        issued_at: "2026-07-15T07:00:00.000Z",
        activated_at: "2026-07-15T07:05:00.000Z",
        last_used_at: null,
        revoked_at: null,
        replacement_of_id: null,
        replaced_by_id: null,
      },
    ])
    const service = createTapBandLifecycleService(client, { telemetryEnabled: false })

    const credentials = await service.listCustomerCredentials({ userId: "user-1" })

    expect(credentials).toHaveLength(1)
    expect(credentials[0]).toMatchObject({
      credentialId: "credential-1",
      credentialPublicId: "TB-0001",
      credentialType: "desfire_ev3",
      chipFamily: "DESFire EV3",
      keyVersion: "kv1",
    })
  })

  it("maps stable lifecycle reason codes to HTTP statuses", () => {
    expect(tapBandLifecycleHttpStatus("tapband_unauthorized")).toBe(403)
    expect(tapBandLifecycleHttpStatus("tapband_credential_not_found")).toBe(404)
    expect(tapBandLifecycleHttpStatus("tapband_already_used")).toBe(409)
    expect(tapBandLifecycleHttpStatus("tapband_no_entitlement")).toBe(422)
    expect(tapBandLifecycleHttpStatus("tapband_lifecycle_failed")).toBe(400)
  })

  it("records privacy-minimised lifecycle telemetry after successful RPC calls", async () => {
    const telemetry: unknown[] = []
    const { client } = fakeRpcClient({
      ok: true,
      valid: true,
      outcome: "valid",
      credential_id: "credential-1",
      event_id: "event-1",
      order_item_id: "order-item-1",
      reason_code: "tapband_valid_entitlement",
    })
    const service = createTapBandLifecycleService(client, {
      recordTelemetry: async (input) => {
        telemetry.push(input)
      },
    })

    await service.resolveCredentialForEvent({
      credentialPublicId: "TB-0001",
      eventId: "event-1",
      actorId: "scanner-1",
      deviceId: "device-1",
      attemptId: "attempt-1",
    })

    expect(telemetry).toEqual([
      expect.objectContaining({
        eventType: "credential_check_in",
        severity: "info",
        eventId: "event-1",
        deviceId: "device-1",
        outcome: "valid",
        channel: "nfc",
        credentialId: "credential-1",
        serial: "TB-0001",
        actorId: "scanner-1",
        correlationId: "attempt-1",
        metadata: expect.objectContaining({
          operation: "resolve_for_event",
          reasonCode: "tapband_valid_entitlement",
          valid: true,
        }),
      }),
    ])
  })

  it("maps unknown credential resolution telemetry to enumeration signals", async () => {
    const telemetry: unknown[] = []
    const { client } = fakeRpcClient({
      ok: false,
      valid: false,
      reason_code: "tapband_unknown",
      message: "Credential not found",
    })
    const service = createTapBandLifecycleService(client, {
      recordTelemetry: async (input) => {
        telemetry.push(input)
      },
    })

    await service.resolveCredentialForEvent({
      credentialPublicId: "TB-UNKNOWN",
      eventId: "event-1",
      actorId: "scanner-1",
      deviceId: "device-1",
      attemptId: "attempt-unknown",
    })

    expect(telemetry).toEqual([
      expect.objectContaining({
        eventType: "unknown_serial",
        severity: "warning",
        outcome: "tapband_unknown",
        serial: "TB-UNKNOWN",
        correlationId: "attempt-unknown",
      }),
    ])
  })

  it("does not fail lifecycle operations when telemetry recording fails", async () => {
    const { client } = fakeRpcClient({
      ok: true,
      status: "revoked",
      credential_id: "credential-1",
    })
    const service = createTapBandLifecycleService(client, {
      recordTelemetry: async () => {
        throw new Error("telemetry unavailable")
      },
    })

    await expect(
      service.revokeCredential({
        credentialId: "credential-1",
        actorId: "support-1",
        reason: "customer reported lost",
      }),
    ).resolves.toMatchObject({
      ok: true,
      status: "revoked",
      credentialId: "credential-1",
    })
  })
})

function fakeRpcClient(data: unknown, error: { message: string } | null = null) {
  const calls: Array<{ functionName: string; args: Record<string, unknown> }> = []
  const client = {
    rpc: async (functionName: string, args: Record<string, unknown>) => {
      calls.push({ functionName, args })
      return { data, error }
    },
  }

  return { client, calls }
}
