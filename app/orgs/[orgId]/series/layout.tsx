import type React from "react"

import { requireOrganizerSection } from "@/lib/organizer/access"

/** Series pages: managers. Covers every page in this section (ADR 0002). */
export default async function SeriesSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  await requireOrganizerSection(orgId, "series")
  return <>{children}</>
}
