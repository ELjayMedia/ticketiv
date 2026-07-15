import { describe, expect, it } from "vitest"

import {
  buildTapBandProfile,
  validateTapBandLostReport,
  type TapBandEntitlementRecord,
} from "@/lib/data/attendee/tapband"
import type { TapBandCustomerCredential } from "@/lib/tapband/lifecycle"

const NOW = new Date("2026-07-15T10:00:00.000Z")

describe("tapband profile", () => {
  it("builds a privacy-safe customer profile for owned credentials only", () => {
    const profile = buildTapBandProfile(
      [
        credential({
          credentialId: "credential-active",
          credentialPublicId: "ticketiv-raw-public-a1b2",
          status: "active",
          activatedAt: "2026-07-14T08:00:00.000Z",
        }),
      ],
      [
        entitlement({
          credential_id: "credential-active",
          order_item_id: "order-item-1",
          event_id: "event-1",
          eventTitle: "Future Night",
          startsAt: "2026-08-01T18:00:00.000Z",
        }),
        entitlement({
          credential_id: "credential-other-user",
          order_item_id: "order-item-2",
          event_id: "event-2",
          eventTitle: "Other Account Event",
          startsAt: "2026-08-02T18:00:00.000Z",
        }),
      ],
      NOW,
    )

    expect(profile.activeCredential).toMatchObject({
      credentialId: "credential-active",
      safeLabel: "TapBand ending A1B2",
      serialSuffix: "A1B2",
      statusLabel: "Active",
    })
    expect(profile.eligibleTickets).toEqual([
      expect.objectContaining({
        credentialId: "credential-active",
        orderItemId: "order-item-1",
        eventTitle: "Future Night",
      }),
    ])
    expect(JSON.stringify(profile.credentials)).not.toContain("ticketiv-raw-public-a1b2")
  })

  it("keeps inactive or already-used tickets out of active TapBand eligibility", () => {
    const profile = buildTapBandProfile(
      [
        credential({
          credentialId: "credential-active",
          credentialPublicId: "TB-0001",
          status: "active",
        }),
        credential({
          credentialId: "credential-lost",
          credentialPublicId: "TB-0002",
          status: "lost",
        }),
      ],
      [
        entitlement({
          credential_id: "credential-active",
          order_item_id: "checked-in-item",
          event_id: "event-1",
          checkedInAt: "2026-07-15T09:00:00.000Z",
        }),
        entitlement({
          credential_id: "credential-lost",
          order_item_id: "lost-item",
          event_id: "event-2",
        }),
        entitlement({
          credential_id: "credential-active",
          order_item_id: "future-item",
          event_id: "event-3",
          eventTitle: "Still Eligible",
          startsAt: "2026-08-01T18:00:00.000Z",
        }),
      ],
      NOW,
    )

    expect(profile.eligibleTickets).toEqual([
      expect.objectContaining({
        orderItemId: "future-item",
        eventTitle: "Still Eligible",
      }),
    ])
  })

  it("requires confirmation, ownership and an active lifecycle before lost reporting", () => {
    const activeProfile = buildTapBandProfile([
      credential({
        credentialId: "credential-active",
        credentialPublicId: "TB-0001",
        status: "active",
      }),
    ])
    const lostProfile = buildTapBandProfile([
      credential({
        credentialId: "credential-lost",
        credentialPublicId: "TB-0002",
        status: "lost",
      }),
    ])

    expect(validateTapBandLostReport(activeProfile, "credential-active", "")).toMatchObject({
      ok: false,
      error: expect.stringContaining("LOST"),
    })
    expect(validateTapBandLostReport(activeProfile, "credential-other", "LOST")).toMatchObject({
      ok: false,
      error: expect.stringContaining("not linked"),
    })
    expect(validateTapBandLostReport(lostProfile, "credential-lost", "LOST")).toMatchObject({
      ok: false,
      error: expect.stringContaining("inactive"),
    })
    expect(validateTapBandLostReport(activeProfile, "credential-active", "LOST")).toEqual({ ok: true })
  })

  it("keeps replaced credentials in history with friendly lineage", () => {
    const profile = buildTapBandProfile([
      credential({
        credentialId: "credential-new",
        credentialPublicId: "TB-0100",
        status: "active",
        replacementOfId: "credential-old",
      }),
      credential({
        credentialId: "credential-old",
        credentialPublicId: "TB-0001",
        status: "replaced",
        replacedById: "credential-new",
      }),
    ])

    expect(profile.activeCredential?.credentialId).toBe("credential-new")
    expect(profile.credentials.find((item) => item.credentialId === "credential-old")).toMatchObject({
      statusLabel: "Replaced",
      lineageLabel: "Replaced by TapBand ending 0100",
    })
  })
})

function credential(
  overrides: Partial<TapBandCustomerCredential> & Pick<TapBandCustomerCredential, "credentialId" | "credentialPublicId" | "status">,
): TapBandCustomerCredential {
  return {
    credentialId: overrides.credentialId,
    credentialPublicId: overrides.credentialPublicId,
    inventoryId: overrides.inventoryId ?? `inventory-${overrides.credentialId}`,
    status: overrides.status,
    credentialType: overrides.credentialType ?? "desfire_ev3",
    chipFamily: overrides.chipFamily ?? "DESFire EV3",
    keyVersion: overrides.keyVersion ?? "kv1",
    issuedAt: overrides.issuedAt ?? "2026-07-14T07:00:00.000Z",
    activatedAt: overrides.activatedAt ?? null,
    lastUsedAt: overrides.lastUsedAt ?? null,
    revokedAt: overrides.revokedAt ?? null,
    replacementOfId: overrides.replacementOfId ?? null,
    replacedById: overrides.replacedById ?? null,
    raw: overrides.raw ?? {},
  }
}

function entitlement(
  overrides: Partial<TapBandEntitlementRecord> & {
    credential_id: string
    order_item_id: string
    event_id: string
    eventTitle?: string
    startsAt?: string
    checkedInAt?: string | null
  },
): TapBandEntitlementRecord {
  return {
    credential_id: overrides.credential_id,
    event_id: overrides.event_id,
    order_item_id: overrides.order_item_id,
    status: overrides.status ?? "active",
    valid_from: overrides.valid_from ?? "2026-07-14T07:00:00.000Z",
    valid_until: overrides.valid_until ?? null,
    removed_at: overrides.removed_at ?? null,
    order_items: {
      id: overrides.order_item_id,
      name: "General entry",
      status: "issued",
      checked_in_at: overrides.checkedInAt ?? null,
      ticket_types: {
        name: "General entry",
        events: {
          id: overrides.event_id,
          title: overrides.eventTitle ?? "Future Event",
          starts_at: overrides.startsAt ?? "2026-08-01T18:00:00.000Z",
        },
      },
    },
  }
}
