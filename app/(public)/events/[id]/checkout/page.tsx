'use server'

import { notFound } from 'next/navigation'
import { getPublicEvents } from '@/lib/data/public/events'
import { CheckoutClient } from './checkout-client'

interface CheckoutPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ticket_type_id?: string }>
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { id } = await params
  const { ticket_type_id } = await searchParams

  const events = await getPublicEvents()
  const event = events.find((e) => e.slug === id || e.id === id)

  if (!event) {
    notFound()
  }

  const selectedTicketType = event.ticket_types?.find(
    (tt) => tt.id === ticket_type_id
  )

  return <CheckoutClient event={event} selectedTicketType={selectedTicketType} />
}
