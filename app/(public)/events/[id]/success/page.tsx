import { permanentRedirect } from "next/navigation"

interface SuccessPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ order_id?: string }>
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { order_id } = await searchParams

  if (order_id) {
    permanentRedirect(`/orders/${order_id}/confirmation`)
  }

  permanentRedirect("/my-tickets")
}
