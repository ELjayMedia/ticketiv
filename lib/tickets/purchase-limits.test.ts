import { describe, expect, it } from "vitest";

import {
  getEffectivePurchaseLimit,
  isPerOrderLimitWithinBuyerLimit,
  isValidOptionalPurchaseLimit,
  parseOptionalPurchaseLimit,
  purchaseLimitInputValue,
} from "./purchase-limits";

describe("purchase limits", () => {
  it("treats blank and legacy zero values as unlimited", () => {
    expect(parseOptionalPurchaseLimit(null)).toBeNull();
    expect(parseOptionalPurchaseLimit("")).toBeNull();
    expect(parseOptionalPurchaseLimit("   ")).toBeNull();
    expect(parseOptionalPurchaseLimit(0)).toBeNull();
    expect(parseOptionalPurchaseLimit("0")).toBeNull();
    expect(purchaseLimitInputValue(0)).toBe("");
  });

  it("accepts only positive whole-number configured limits", () => {
    expect(parseOptionalPurchaseLimit("12")).toBe(12);
    expect(isValidOptionalPurchaseLimit(12)).toBe(true);
    expect(isValidOptionalPurchaseLimit(null)).toBe(true);
    expect(isValidOptionalPurchaseLimit(-1)).toBe(false);
    expect(isValidOptionalPurchaseLimit(1.5)).toBe(false);
    expect(isValidOptionalPurchaseLimit(Number.NaN)).toBe(false);
  });

  it("leaves an entirely unconfigured purchase unlimited", () => {
    expect(getEffectivePurchaseLimit({
      perUserLimit: null,
      perOrderLimit: null,
      remaining: null,
    })).toBeNull();
  });

  it("uses the narrowest organizer-configured limit", () => {
    expect(getEffectivePurchaseLimit({
      perUserLimit: 8,
      perOrderLimit: 5,
      remaining: 20,
    })).toBe(5);
  });

  it("uses remaining inventory when it is lower than configured limits", () => {
    expect(getEffectivePurchaseLimit({
      perUserLimit: 8,
      perOrderLimit: 5,
      remaining: 3,
    })).toBe(3);
    expect(getEffectivePurchaseLimit({
      perUserLimit: null,
      perOrderLimit: null,
      remaining: 0,
    })).toBe(0);
  });

  it("rejects an order limit above a configured buyer limit", () => {
    expect(isPerOrderLimitWithinBuyerLimit(4, 5)).toBe(false);
    expect(isPerOrderLimitWithinBuyerLimit(5, 5)).toBe(true);
    expect(isPerOrderLimitWithinBuyerLimit(null, 5)).toBe(true);
    expect(isPerOrderLimitWithinBuyerLimit(5, null)).toBe(true);
  });
});
