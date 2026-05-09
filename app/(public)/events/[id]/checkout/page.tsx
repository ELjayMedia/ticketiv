import { notFound } from "next/navigation"

import { CheckoutClient } from "./checkout-client"
import { getEventDetailById } from "@/lib/data/public/event-detail"

interface CheckoutPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ items?: string; ticket_type_id?: string; quantity?: string }>
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { id } = await params
  const query = await searchParams

  const event = await getEventDetailById(id)

  if (!event) {
    notFound()
  }

  return <CheckoutClient event={event} selectedItemsParam={query.items} legacyTicketTypeId={query.ticket_type_id} legacyQuantity={query.quantity} />
}
