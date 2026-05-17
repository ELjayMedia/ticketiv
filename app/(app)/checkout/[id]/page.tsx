import { permanentRedirect } from "next/navigation"

interface CheckoutPageProps {
  params: Promise<{ id: string }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params
  permanentRedirect(`/events/${id}/checkout`)
}
