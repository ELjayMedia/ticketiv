import { notFound } from "next/navigation"
import { BoxOffice } from "@/components/quiet/screens/pos/box-office"
import { getPOSContext } from "@/lib/data/organizer/pos"
import { POSClient } from "./pos-client"

export const metadata = { title: "Box office" }
export const dynamic = "force-dynamic"

export default async function POSPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; eventId: string }>
  searchParams?: Promise<{ device?: string }>
}) {
  const { orgId, eventId } = await params
  const { device } = (await searchParams) ?? {}
  const ctx = await getPOSContext(orgId, eventId, device)
  if (!ctx) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[480px]">
      <POSClient ctx={ctx!} />
    </div>
  )
}
