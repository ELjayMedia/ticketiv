export type PurchaseLimitValue = number | null | undefined;

export function parseOptionalPurchaseLimit(value: unknown): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }

  const parsed = Number(value);
  return parsed === 0 ? null : parsed;
}

export function isValidOptionalPurchaseLimit(value: PurchaseLimitValue): boolean {
  return value == null || (Number.isInteger(value) && value > 0);
}

export function normalizeConfiguredPurchaseLimit(value: PurchaseLimitValue): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

export function purchaseLimitInputValue(value: PurchaseLimitValue): string {
  return normalizeConfiguredPurchaseLimit(value)?.toString() ?? "";
}

export function getEffectivePurchaseLimit({
  perUserLimit,
  perOrderLimit,
  remaining,
}: {
  perUserLimit: PurchaseLimitValue;
  perOrderLimit: PurchaseLimitValue;
  remaining: number | null | undefined;
}): number | null {
  const configuredLimits = [
    normalizeConfiguredPurchaseLimit(perUserLimit),
    normalizeConfiguredPurchaseLimit(perOrderLimit),
  ].filter((value): value is number => value != null);

  const availabilityLimit =
    typeof remaining === "number" && Number.isFinite(remaining)
      ? Math.max(0, Math.floor(remaining))
      : null;
  const limits = availabilityLimit == null
    ? configuredLimits
    : [...configuredLimits, availabilityLimit];

  return limits.length > 0 ? Math.min(...limits) : null;
}

export function isPerOrderLimitWithinBuyerLimit(
  perUserLimit: PurchaseLimitValue,
  perOrderLimit: PurchaseLimitValue,
): boolean {
  const buyerLimit = normalizeConfiguredPurchaseLimit(perUserLimit);
  const orderLimit = normalizeConfiguredPurchaseLimit(perOrderLimit);
  return buyerLimit == null || orderLimit == null || orderLimit <= buyerLimit;
}
