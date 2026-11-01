import type React from "react"

import { requireOrganizerSection } from "@/lib/organizer/access"

/** Payout pages: managers and finance. Covers every page in this section (ADR 0002). */
export default async function PayoutsSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  await requireOrganizerSection(orgId, "payouts")
  return <>{children}</>
}
