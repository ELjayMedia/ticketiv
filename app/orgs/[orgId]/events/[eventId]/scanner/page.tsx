import { ScannerClient } from "./scanner-client"
import { requireEventScannerAccess } from "@/lib/org-management"

interface ScannerPageProps {
  params: Promise<{ orgId: string; eventId: string }>
}

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { orgId, eventId } = await params
  await requireEventScannerAccess(orgId, eventId)

  return <ScannerClient orgId={orgId} eventId={eventId} />
}
