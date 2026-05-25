/**
 * Human copy for promo-code failure reasons returned by
 * `fn_apply_promo_code_to_order`. Kept out of the server-action module so
 * it can be imported by client components — "use server" files can only
 * export async functions.
 */
const PROMO_REASON_COPY: Record<string, string> = {
  code_required: "Enter a promo code.",
  code_invalid: "That code isn't valid for this event.",
  code_exhausted: "That code has reached its redemption limit.",
  code_already_used: "You've already used this code.",
  code_already_applied: "This code is already applied to your order.",
  rule_has_no_effect: "That code doesn't change the total for this order.",
  order_not_found: "We couldn't find your order to apply the code.",
  order_not_owned: "You can only apply codes to your own order.",
  order_not_pending: "This order can no longer accept promo codes.",
  order_has_no_items: "Add at least one ticket before applying a code.",
}

export function describePromoFailure(reason: string | undefined): string {
  if (!reason) return "Unable to apply promo code."
  return PROMO_REASON_COPY[reason] ?? "Unable to apply promo code."
}
