import { redirect } from "next/navigation"

import { PaymentMethodsScreen } from "@/components/quiet/screens/account/payment-methods-screen"
import { listMyPaymentMethods } from "@/lib/data/attendee/payment-methods"

export const metadata = { title: "Payment methods" }
export const dynamic = "force-dynamic"

export default async function PaymentMethodsPage() {
  const methods = await listMyPaymentMethods()
  if (methods === null) {
    redirect("/login")
  }

  return <PaymentMethodsScreen methods={methods!} />
}
