import { redirect } from "next/navigation"

import { getEventById } from "@/lib/events"
import CheckoutClient from "./checkout-client"

export const dynamic = "force-dynamic"

interface CheckoutPageProps {
  params: { id: string }
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const event = await getEventById(params.id)

  if (!event) {
    redirect("/browse")
  }

  if (event.ticket_types.length === 0) {
    redirect(`/events/${event.id}`)
  }

  return <CheckoutClient event={event} />
}
