import type React from "react"

import { requireOrganizerSection } from "@/lib/organizer/access"

/** Team pages: owners and admins. Covers every page in this section (ADR 0002). */
export default async function TeamSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  await requireOrganizerSection(orgId, "team", { team: true })
  return <>{children}</>
}
