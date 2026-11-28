/**
 * The one thing stopping the buyer from paying, in words for the pay button.
 * Null when nothing is: the button then shows its normal label. Checkout
 * screens show this instead of a silently greyed-out button.
 */
export function checkoutPayBlocker({
  buyerEmail,
  holdRemaining,
  lineCount,
}: {
  buyerEmail: string
  holdRemaining: number
  lineCount: number
}): string | null {
  if (lineCount === 0) return "Choose tickets"
  if (holdRemaining <= 0) return "Hold expired"
  const email = buyerEmail.trim()
  if (!email) return "Add your email"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Check your email"
  return null
}
