import type { ReactNode } from "react"

import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin()

  return <SuperAdminShell userEmail={user.email}>{children}</SuperAdminShell>
}
