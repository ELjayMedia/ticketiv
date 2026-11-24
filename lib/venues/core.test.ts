import { describe, expect, it } from "vitest"

import {
  assignableVenueRoles,
  canEditVenueProfile,
  canRemoveVenueMember,
  existingVenueIdFromError,
  isVenueRole,
  venueErrorMessage,
} from "@/lib/venues/core"

describe("venue roles", () => {
  it("lets owners and managers edit the profile, not staff or strangers", () => {
    expect(canEditVenueProfile("venue_owner")).toBe(true)
    expect(canEditVenueProfile("venue_manager")).toBe(true)
    expect(canEditVenueProfile("venue_staff")).toBe(false)
    expect(canEditVenueProfile(null)).toBe(false)
  })

  it("mirrors fn_add_venue_member: owners add managers and staff, managers add staff", () => {
    expect(assignableVenueRoles("venue_owner")).toEqual(["venue_manager", "venue_staff"])
    expect(assignableVenueRoles("venue_manager")).toEqual(["venue_staff"])
    expect(assignableVenueRoles("venue_staff")).toEqual([])
    expect(assignableVenueRoles(null)).toEqual([])
  })

  it("mirrors fn_remove_venue_member, including the non-member case", () => {
    expect(canRemoveVenueMember("venue_owner", "venue_owner", true)).toBe(false)
    expect(canRemoveVenueMember("venue_owner", "venue_manager", false)).toBe(true)
    expect(canRemoveVenueMember("venue_manager", "venue_manager", false)).toBe(false)
    expect(canRemoveVenueMember("venue_manager", "venue_staff", false)).toBe(true)
    expect(canRemoveVenueMember("venue_staff", "venue_staff", true)).toBe(true)
    expect(canRemoveVenueMember("venue_staff", "venue_manager", false)).toBe(false)
    expect(canRemoveVenueMember(null, "venue_staff", false)).toBe(false)
  })

  it("only accepts known roles", () => {
    expect(isVenueRole("venue_manager")).toBe(true)
    expect(isVenueRole("organizer_owner")).toBe(false)
    expect(isVenueRole(undefined)).toBe(false)
  })
})

describe("venue error copy", () => {
  it("maps RPC error codes to plain language", () => {
    expect(venueErrorMessage({ message: "claim_pending" })).toMatch(/already have a request/)
    expect(venueErrorMessage({ message: "x", code: "42501" })).toBe("Your role can't do this.")
    expect(venueErrorMessage({ message: "connection reset" })).toBe("Something went wrong. Please try again.")
  })

  it("reads the existing venue id from a venue_exists error", () => {
    const id = "7e570000-0000-4000-8000-000000000001"
    expect(existingVenueIdFromError({ message: "venue_exists", details: id })).toBe(id)
    expect(existingVenueIdFromError({ message: "venue_exists", details: "nope" })).toBeNull()
    expect(existingVenueIdFromError({ message: "name_required", details: id })).toBeNull()
  })
})
