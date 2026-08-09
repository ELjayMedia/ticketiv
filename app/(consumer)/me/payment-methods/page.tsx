import { redirect } from "next/navigation"

/**
 * Saved payment methods are intentionally not part of the Ticketiv customer UI.
 * Keep this compatibility redirect so old bookmarks do not expose a retired screen.
 */
export default function PaymentMethodsPage() {
  redirect("/me")
}
