import { describe, expect, it } from "vitest";
import { canViewTicketHolderGuide, guestGuidePath } from "../lib/guest-companion";

describe("guest read-only companion", () => {
  it("allows only live ticket-holder states to see restricted updates", () => {
    expect(canViewTicketHolderGuide("issued")).toBe(true);
    expect(canViewTicketHolderGuide("checked_in")).toBe(true);
    for (const state of ["pending", "transferred", "refunded", "revoked", "not_paid", ""]) {
      expect(canViewTicketHolderGuide(state)).toBe(false);
    }
  });
  it("scopes the companion URL to a single encoded bearer token", () => {
    expect(guestGuidePath("a.b")).toBe("/t/a.b/companion");
    expect(guestGuidePath("a/b")).toBe("/t/a%2Fb/companion");
  });
});
