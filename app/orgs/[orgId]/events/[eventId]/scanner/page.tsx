import { redirect } from "next/navigation"

import { requireEventScannerAccess } from "@/lib/org-management"

interface ScannerPageProps {
  params: Promise<{ orgId: string; eventId: string }>
}

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { orgId, eventId } = await params
  await requireEventScannerAccess(orgId, eventId)

  const setupParams = new URLSearchParams({
    orgId,
    eventId,
    returnTo: `/orgs/${orgId}/events/${eventId}`,
  })

  redirect(`/scan/setup?${setupParams.toString()}`)
}
