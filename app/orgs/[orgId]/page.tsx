import { redirect } from "next/navigation"

import { getOrganizerAccess, organizerHomePath } from "@/lib/organizer/access"

/** Workspace entry: send each role to where its work starts (ADR 0002). */
export default async function OrgHomePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const access = await getOrganizerAccess(orgId)
  if (!access) redirect("/403")
  redirect(organizerHomePath(orgId, access.role))
}
