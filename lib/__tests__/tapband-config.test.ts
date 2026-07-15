import { describe, expect, it } from "vitest"

import {
  evaluateTapBandAccess,
  resolveEffectiveTapBandConfig,
  type TapBandFeatureConfigRow,
  type TapBandKillSwitchRow,
} from "@/lib/tapband/config"

describe("tapband config", () => {
  it("defaults production TapBand capabilities to disabled", () => {
    const decision = evaluateTapBandAccess([], [], {
      environment: "production",
      capability: "online_nfc_scanning",
    })

    expect(decision.allowed).toBe(false)
    expect(decision.reasonCode).toBe("tapband_disabled")
    expect(decision.config.capabilities.online_nfc_scanning).toBe(false)
  })

  it("resolves a selectively enabled event pilot over the platform default", () => {
    const configs = [
      configRow({ id: "platform-default", environment: "production", enabled: false }),
      configRow({
        id: "event-pilot",
        environment: "production",
        org_id: "org-1",
        event_id: "event-1",
        enabled: true,
        credential_lookup_enabled: true,
        online_nfc_scanning_enabled: true,
        allowed_chip_families: ["DESFire EV3"],
        allowed_key_versions: ["kv1"],
        supported_entry_zones: ["gate-a"],
      }),
    ]

    const decision = evaluateTapBandAccess(configs, [], {
      environment: "production",
      orgId: "org-1",
      eventId: "event-1",
      capability: "online_nfc_scanning",
      chipFamily: "DESFire EV3",
      keyVersion: "kv1",
      entryZone: "gate-a",
    })

    expect(decision.allowed).toBe(true)
    expect(decision.config.sourceConfigId).toBe("event-pilot")
    expect(decision.config.allowedChipFamilies).toEqual(["DESFire EV3"])
  })

  it("keeps NFC disabled while QR fallback remains enabled", () => {
    const configs = [
      configRow({
        enabled: true,
        credential_lookup_enabled: true,
        online_nfc_scanning_enabled: true,
        qr_fallback_enabled: true,
      }),
    ]
    const killSwitches = [
      killSwitch({
        switch_type: "nfc_scanning",
        reason_code: "tapband_nfc_disabled_by_ops",
        reason: "NFC readers disabled during incident response.",
      }),
    ]

    const nfcDecision = evaluateTapBandAccess(configs, killSwitches, {
      environment: "production",
      channel: "nfc",
      now: "2026-07-15T05:00:00.000Z",
    })
    const qrDecision = evaluateTapBandAccess(configs, killSwitches, {
      environment: "production",
      channel: "qr",
      now: "2026-07-15T05:00:00.000Z",
    })

    expect(nfcDecision.allowed).toBe(false)
    expect(nfcDecision.reasonCode).toBe("tapband_nfc_disabled_by_ops")
    expect(qrDecision.allowed).toBe(true)
  })

  it("rejects disabled batches and unsupported key versions with stable reasons", () => {
    const configs = [
      configRow({
        enabled: true,
        credential_lookup_enabled: true,
        online_nfc_scanning_enabled: true,
        allowed_key_versions: ["kv2"],
      }),
    ]

    const keyDecision = evaluateTapBandAccess(configs, [], {
      environment: "production",
      capability: "online_nfc_scanning",
      keyVersion: "kv1",
    })

    const batchDecision = evaluateTapBandAccess(configs, [
      killSwitch({
        switch_type: "supplier_batch",
        target_ref: "batch-a",
        reason_code: "tapband_supplier_batch_disabled",
        reason: "Supplier batch disabled after read-back mismatch reports.",
      }),
    ], {
      environment: "production",
      capability: "credential_lookup",
      supplierBatch: "batch-a",
      keyVersion: "kv2",
      now: "2026-07-15T05:00:00.000Z",
    })

    expect(keyDecision.allowed).toBe(false)
    expect(keyDecision.reasonCode).toBe("tapband_key_version_not_allowed")
    expect(batchDecision.allowed).toBe(false)
    expect(batchDecision.reasonCode).toBe("tapband_supplier_batch_disabled")
  })

  it("exposes the propagation window on effective config", () => {
    const config = resolveEffectiveTapBandConfig([
      configRow({ enabled: true, effective_within_seconds: 45 }),
    ])

    expect(config.effectiveWithinSeconds).toBe(45)
  })
})

function configRow(overrides: Partial<TapBandFeatureConfigRow> = {}): TapBandFeatureConfigRow {
  return {
    id: "config-1",
    environment: "production",
    org_id: null,
    event_id: null,
    enabled: false,
    product_visibility_enabled: false,
    credential_lookup_enabled: false,
    provisioning_enabled: false,
    activation_enabled: false,
    outlet_lookup_enabled: false,
    outlet_sales_enabled: false,
    online_nfc_scanning_enabled: false,
    offline_nfc_scanning_enabled: false,
    offline_manifest_issuance_enabled: false,
    qr_fallback_enabled: false,
    lost_replacement_enabled: false,
    desfire_secure_mode_enabled: false,
    allowed_chip_families: [],
    allowed_key_versions: [],
    supported_entry_zones: [],
    manifest_validity_seconds: 900,
    tap_debounce_ms: 1500,
    outlet_verification_requirement: "phone_otp",
    replacement_fee_cents: 0,
    replacement_fee_waiver_enabled: false,
    effective_within_seconds: 60,
    public_client_config: {},
    updated_at: "2026-07-15T05:00:00.000Z",
    ...overrides,
  }
}

function killSwitch(overrides: Partial<TapBandKillSwitchRow> = {}): TapBandKillSwitchRow {
  return {
    id: "switch-1",
    switch_type: "all_credential_lookups",
    environment: "production",
    org_id: null,
    event_id: null,
    target_ref: null,
    capability: null,
    reason_code: "tapband_disabled_by_ops",
    reason: "TapBand disabled by operations.",
    enabled: true,
    starts_at: "2026-07-15T04:00:00.000Z",
    ends_at: null,
    created_at: "2026-07-15T04:00:00.000Z",
    ...overrides,
  }
}
